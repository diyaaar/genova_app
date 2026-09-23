import { UploadError, verifiedStream } from '../repertoire-upload/stream.ts';

export const MAX_CHAT_IMAGE_BYTES = 12 * 1024 * 1024;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIME=new Set(['image/jpeg','image/png','image/webp','image/gif']);
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-upload-metadata, idempotency-key',
  'Cache-Control':'private, no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};

export interface ChatMediaMetadata{kind:'message-image'|'room-avatar';batchId:string;roomId:string;
  replyToId:string|null;expectedCount:number;position:number;fileName:string;mimeType:string;size:number}
export interface ChatMediaActor{userId:string;sessionId:string|null;choirId:string}
export interface ChatMediaTarget{fileVersionId?:string;bucket?:string;objectKey?:string;state?:string}
export interface ChatMediaReservation extends ChatMediaTarget{state:'uploading'|'part-ready'|'committed';kind?:string;
  batchId?:string;position?:number;choirId?:string;roomId?:string;lease?:string;acquired?:boolean;
  message?:Record<string,unknown>|null;avatarAlias?:string|null;priorAvatar?:ChatMediaTarget|null;
  avatarCleanupState?:string|null}
export interface ChatMediaUploadDependencies{enabled:boolean;bucket:string;authorize(token:string):Promise<ChatMediaActor>;
  transact(input:{action:'reserve'|'commit'|'finalize-avatar';actor:ChatMediaActor;retryKey:string;
    metadata:ChatMediaMetadata;lease?:string;sha256?:string}):Promise<ChatMediaReservation>;
  object(input:{target:ChatMediaTarget;method:'PUT'|'GET'|'DELETE';metadata:ChatMediaMetadata;
    body?:ReadableStream<Uint8Array>;signal:AbortSignal}):Promise<Response>}
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:CORS});

export function parseChatMediaUpload(request:Request):{retryKey:string;metadata:ChatMediaMetadata}{
  const retryKey=request.headers.get('idempotency-key')??'',encoded=request.headers.get('x-upload-metadata')??'';
  if(!UUID.test(retryKey)||encoded.length>10_000)throw new UploadError('invalid-metadata');
  let metadata:ChatMediaMetadata;
  try{metadata=JSON.parse(decodeURIComponent(encoded));}catch{throw new UploadError('invalid-metadata');}
  if(!metadata||typeof metadata!=='object'||Array.isArray(metadata)||Object.keys(metadata).length!==9||
    !['message-image','room-avatar'].includes(metadata.kind)||!UUID.test(metadata.batchId)||!UUID.test(metadata.roomId)||
    (metadata.replyToId!==null&&!UUID.test(metadata.replyToId))||!Number.isInteger(metadata.expectedCount)||
    metadata.expectedCount<1||metadata.expectedCount>5||!Number.isInteger(metadata.position)||metadata.position<0||
    metadata.position>=metadata.expectedCount||(metadata.kind==='room-avatar'&&(metadata.expectedCount!==1||metadata.position!==0||metadata.replyToId!==null))||
    typeof metadata.fileName!=='string'||!metadata.fileName.trim()||metadata.fileName.length>255||/[\u0000-\u001f\u007f/\\]/.test(metadata.fileName)||
    typeof metadata.mimeType!=='string'||!MIME.has(metadata.mimeType.toLowerCase())||
    request.headers.get('content-type')!==metadata.mimeType||!Number.isSafeInteger(metadata.size)||metadata.size<1)
    throw new UploadError('invalid-metadata');
  metadata={...metadata,mimeType:metadata.mimeType.toLowerCase()};
  if(metadata.size>MAX_CHAT_IMAGE_BYTES)throw new UploadError('size-exceeded',413);
  const length=request.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)!==metadata.size))throw new UploadError('size-mismatch');
  if(!request.body)throw new UploadError('empty-body');return{retryKey,metadata};
}

function assertOwned(r:ChatMediaReservation,a:ChatMediaActor,m:ChatMediaMetadata,bucket:string){
  const expected=`choirs/${a.choirId}/chat/${m.roomId}/${m.kind}/${m.batchId}/${m.position}/${r.fileVersionId}/content`;
  if(r.kind!==m.kind||r.batchId!==m.batchId||r.position!==m.position||r.choirId!==a.choirId||r.roomId!==m.roomId||
    !r.fileVersionId||!UUID.test(r.fileVersionId)||!r.lease||!UUID.test(r.lease)||r.bucket!==bucket||r.objectKey!==expected)
    throw new UploadError('invalid-reservation',502);
}

/** Streams one ordered batch part, verifies provider bytes, and exposes only a complete batch. */
export function createChatMediaUploadHandler(deps:ChatMediaUploadDependencies){return async(request:Request)=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  if(request.method!=='POST')return json({error:'method-not-allowed'},405);
  if(!deps.enabled)return json({error:'upload-unavailable'},503);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90_000),abort=()=>controller.abort();
  request.signal.addEventListener('abort',abort,{once:true});let tracked:ReturnType<typeof verifiedStream>|undefined;
  let reservation:ChatMediaReservation|undefined,actor:ChatMediaActor|undefined,metadata:ChatMediaMetadata|undefined,retryKey:string|undefined,putConfirmed=false;
  try{
    const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')??'')?.[1];
    if(!token)throw new UploadError('unauthorized',401);
    const parsed=parseChatMediaUpload(request),currentMetadata=parsed.metadata,currentRetryKey=parsed.retryKey,currentActor=await deps.authorize(token);
    metadata=currentMetadata;retryKey=currentRetryKey;actor=currentActor;
    const transact=(action:'reserve'|'commit'|'finalize-avatar',lease?:string,sha256?:string)=>
      deps.transact({action,actor:currentActor,retryKey:currentRetryKey,metadata:currentMetadata,lease,sha256});
    reservation=await transact('reserve');
    if(reservation.state==='committed'){
      let cleanupPending=false;
      if(reservation.priorAvatar?.state==='deleting'){
        const removed=await deps.object({target:reservation.priorAvatar,method:'DELETE',metadata:currentMetadata,signal:AbortSignal.timeout(15_000)});
        await removed.body?.cancel();
        if(removed.ok||removed.status===404)await transact('finalize-avatar',reservation.lease);
        else cleanupPending=true;
      }
      return json({...reservation,cleanupPending,replayed:true});
    }
    if(reservation.state==='part-ready')return json({...reservation,replayed:true},202);
    if(reservation.state!=='uploading')throw new UploadError('upload-conflict',409);
    assertOwned(reservation,currentActor,currentMetadata,deps.bucket);
    tracked=verifiedStream(request.body!,currentMetadata);
    const uploaded=await deps.object({target:reservation,method:'PUT',metadata:currentMetadata,body:tracked.stream,signal:controller.signal});
    await uploaded.body?.cancel();if(!uploaded.ok)throw new UploadError('provider-upload-failed',502);
    putConfirmed=true;
    const sha256=tracked.assertFinished();
    const readback=await deps.object({target:reservation,method:'GET',metadata:currentMetadata,signal:controller.signal});
    if(readback.status!==200||readback.headers.get('content-type')!==currentMetadata.mimeType||
      readback.headers.get('content-length')!==String(currentMetadata.size)||!readback.body){await readback.body?.cancel();throw new UploadError('provider-verification-failed',502);}
    const verified=verifiedStream(readback.body,{...currentMetadata,sha256}),reader=verified.stream.getReader();
    while(!(await reader.read()).done){}verified.assertFinished();
    const committed=await transact('commit',reservation.lease,sha256);
    if(committed.state==='part-ready')return json(committed,202);
    if(committed.state!=='committed')throw new UploadError('commit-failed',502);
    let cleanupPending=false;
    if(committed.priorAvatar?.state==='deleting'){
      const removed=await deps.object({target:committed.priorAvatar,method:'DELETE',metadata:currentMetadata,signal:AbortSignal.timeout(15_000)});
      await removed.body?.cancel();
      if(removed.ok||removed.status===404)await transact('finalize-avatar',reservation.lease);
      else cleanupPending=true;
    }
    return json({...committed,cleanupPending,replayed:false},201);
  }catch(error){controller.abort();await tracked?.cancel();
    if(putConfirmed&&reservation&&actor&&metadata&&retryKey){try{const reconciled=await deps.transact({action:'reserve',actor,retryKey,metadata});if(reconciled.state==='committed')return json({...reconciled,replayed:true});const removed=await deps.object({target:reservation,method:'DELETE',metadata,signal:AbortSignal.timeout(15_000)});await removed.body?.cancel();if(!removed.ok&&removed.status!==404)return json({error:'upload-reconciliation-required',retryKey},503);}catch{return json({error:'upload-reconciliation-required',retryKey},503);}}
    return error instanceof UploadError?json({error:error.code},error.status):json({error:'upload-failed'},502);
  }finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);if(!request.bodyUsed)await request.body?.cancel().catch(()=>undefined);}
};}

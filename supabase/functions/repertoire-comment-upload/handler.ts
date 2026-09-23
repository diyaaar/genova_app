import { UploadError, verifiedStream } from '../repertoire-upload/stream.ts';

export const MAX_REPERTOIRE_COMMENT_AUDIO_BYTES = 20 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDIO = new Set(['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/flac']);
const VOICES = new Set(['Soprano','Alto','Tenor','Bass']);
const CORS = {
  'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-upload-metadata, idempotency-key',
  'Cache-Control':'private, no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff',
};

export interface CommentUploadMetadata {
  commentId:string;songId:string;contentHtml:string;targetVoiceGroup:string|null;
  fileName:string;mimeType:string;size:number;
}
export interface CommentActor {userId:string;sessionId:string|null;choirId:string}
export interface CommentReservation {
  state:'uploading'|'pending'|'committed'|'cleanup'|'failed';commentId?:string;songId?:string;
  fileVersionId?:string;choirId?:string;bucket?:string;objectKey?:string;lease?:string;comment?:Record<string,unknown>;
}
export interface CommentUploadDependencies {
  enabled:boolean;bucket:string;authorize(token:string):Promise<CommentActor>;
  transact(input:{action:'reserve'|'commit'|'cleanup'|'failed';actor:CommentActor;retryKey:string;
    metadata:CommentUploadMetadata;lease?:string;sha256?:string}):Promise<CommentReservation>;
  object(input:{reservation:CommentReservation;method:'PUT'|'GET'|'DELETE';metadata:CommentUploadMetadata;
    body?:ReadableStream<Uint8Array>;signal:AbortSignal}):Promise<Response>;
}
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:CORS});

export function parseCommentUpload(request:Request):{retryKey:string;metadata:CommentUploadMetadata}{
  const retryKey=request.headers.get('idempotency-key')??'',encoded=request.headers.get('x-upload-metadata')??'';
  if(!UUID.test(retryKey)||encoded.length>70_000)throw new UploadError('invalid-metadata');
  let metadata:CommentUploadMetadata;
  try{metadata=JSON.parse(decodeURIComponent(encoded));}catch{throw new UploadError('invalid-metadata');}
  if(!metadata||typeof metadata!=='object'||Array.isArray(metadata)||Object.keys(metadata).length!==7||
    !UUID.test(metadata.commentId)||!UUID.test(metadata.songId)||typeof metadata.contentHtml!=='string'||metadata.contentHtml.length>65_536||
    (metadata.targetVoiceGroup!==null&&(!VOICES.has(metadata.targetVoiceGroup)))||typeof metadata.fileName!=='string'||
    !metadata.fileName.trim()||metadata.fileName.length>255||/[\u0000-\u001f\u007f/\\]/.test(metadata.fileName)||
    typeof metadata.mimeType!=='string'||!AUDIO.has(metadata.mimeType.toLowerCase())||
    request.headers.get('content-type')!==metadata.mimeType||!Number.isSafeInteger(metadata.size)||metadata.size<1)
    throw new UploadError('invalid-metadata');
  metadata={...metadata,mimeType:metadata.mimeType.toLowerCase()};
  if(metadata.size>MAX_REPERTOIRE_COMMENT_AUDIO_BYTES)throw new UploadError('size-exceeded',413);
  const length=request.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)!==metadata.size))throw new UploadError('size-mismatch');
  if(!request.body)throw new UploadError('empty-body');return{retryKey,metadata};
}

function assertOwned(r:CommentReservation,a:CommentActor,m:CommentUploadMetadata,bucket:string){
  if(r.commentId!==m.commentId||r.songId!==m.songId||!r.fileVersionId||!UUID.test(r.fileVersionId)||
    !r.lease||!UUID.test(r.lease)||r.choirId!==a.choirId||r.bucket!==bucket||r.objectKey!==
      `choirs/${a.choirId}/repertoire/${m.songId}/comments/${m.commentId}/audio/${r.fileVersionId}/content`)
    throw new UploadError('invalid-reservation',502);
}

/** Auth -> exclusive reservation -> constant-memory signed PUT/readback -> atomic comment commit. */
export function createCommentUploadHandler(deps:CommentUploadDependencies){return async(request:Request)=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  if(request.method!=='POST')return json({error:'method-not-allowed'},405);
  if(!deps.enabled)return json({error:'upload-unavailable'},503);
  let cleanup:(()=>Promise<Response|null>)|undefined,tracked:ReturnType<typeof verifiedStream>|undefined,putConfirmed=false;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90_000),abort=()=>controller.abort();
  request.signal.addEventListener('abort',abort,{once:true});
  try{
    const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')??'')?.[1];
    if(!token)throw new UploadError('unauthorized',401);
    const{metadata,retryKey}=parseCommentUpload(request),actor=await deps.authorize(token);
    const transact=(action:'reserve'|'commit'|'cleanup'|'failed',lease?:string,sha256?:string)=>
      deps.transact({action,actor,retryKey,metadata,lease,sha256});
    const reservation=await transact('reserve');
    if(reservation.state==='committed')return json({comment:reservation.comment,fileVersionId:reservation.fileVersionId,replayed:true});
    if(reservation.state!=='uploading')throw new UploadError('upload-pending',409);assertOwned(reservation,actor,metadata,deps.bucket);
    cleanup=async()=>{try{const state=await transact('cleanup',reservation.lease);
      if(state.state==='committed')return json({comment:state.comment,fileVersionId:state.fileVersionId,replayed:true});
      if(state.state!=='cleanup'||!putConfirmed)throw new Error('Cleanup not safe');
      const removed=await deps.object({reservation,method:'DELETE',metadata,signal:AbortSignal.timeout(15_000)});
      await removed.body?.cancel();if(!removed.ok&&removed.status!==404)throw new Error('Cleanup failed');
      await transact('failed',reservation.lease);return null;
    }catch{return json({error:'upload-reconciliation-required',retryKey},503);}};
    tracked=verifiedStream(request.body!,metadata);
    const uploaded=await deps.object({reservation,method:'PUT',metadata,body:tracked.stream,signal:controller.signal});
    await uploaded.body?.cancel();if(!uploaded.ok)throw new UploadError('provider-upload-failed',502);
    putConfirmed=true;const sha256=tracked.assertFinished();
    const readback=await deps.object({reservation,method:'GET',metadata,signal:controller.signal});
    if(readback.status!==200||readback.headers.get('content-type')!==metadata.mimeType||
      readback.headers.get('content-length')!==String(metadata.size)||!readback.body){await readback.body?.cancel();throw new UploadError('provider-verification-failed',502);}
    const verified=verifiedStream(readback.body,{...metadata,sha256}),reader=verified.stream.getReader();
    while(!(await reader.read()).done){}verified.assertFinished();
    const committed=await transact('commit',reservation.lease,sha256);
    if(committed.state!=='committed'||!committed.comment||!committed.fileVersionId)throw new UploadError('commit-failed',502);
    return json({comment:committed.comment,fileVersionId:committed.fileVersionId,replayed:false},201);
  }catch(error){controller.abort();await tracked?.cancel();const recovered=await cleanup?.();if(recovered)return recovered;
    return error instanceof UploadError?json({error:error.code},error.status):json({error:'upload-failed'},502);
  }finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);if(!request.bodyUsed)await request.body?.cancel().catch(()=>undefined);}
};}

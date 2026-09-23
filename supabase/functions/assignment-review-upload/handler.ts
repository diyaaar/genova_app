import { UploadError, verifiedStream } from '../repertoire-upload/stream.ts';

export const MAX_ASSIGNMENT_REVIEW_AUDIO_BYTES = 20 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDIO = new Set(['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/flac']);
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-upload-metadata, idempotency-key',
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
};

export interface AssignmentReviewUploadMetadata {
  submissionId: string; fileName: string; mimeType: string; size: number;
  status: 'approved' | 'rejected'; reviewerNote: string | null;
}
export interface AssignmentReviewActor { userId: string; sessionId: string | null; choirId: string }
export interface AssignmentReviewReservation {
  state: 'uploading' | 'pending' | 'committed' | 'cleanup' | 'failed';
  submissionId?: string; assignmentId?: string; fileVersionId?: string; choirId?: string; bucket?: string;
  objectKey?: string; lease?: string; submission?: Record<string, unknown>;
}
export interface AssignmentReviewUploadDependencies {
  enabled: boolean; bucket: string;
  authorize(token: string): Promise<AssignmentReviewActor>;
  transact(input: {
    action: 'reserve' | 'commit' | 'cleanup' | 'failed'; actor: AssignmentReviewActor;
    retryKey: string; metadata: AssignmentReviewUploadMetadata; lease?: string; sha256?: string;
  }): Promise<AssignmentReviewReservation>;
  object(input: {
    reservation: AssignmentReviewReservation; method: 'PUT' | 'GET' | 'DELETE';
    metadata: AssignmentReviewUploadMetadata; body?: ReadableStream<Uint8Array>; signal: AbortSignal;
  }): Promise<Response>;
}

function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: CORS }); }

export function parseAssignmentReviewUpload(request: Request): {retryKey:string;metadata:AssignmentReviewUploadMetadata} {
  const retryKey=request.headers.get('idempotency-key')??'',encoded=request.headers.get('x-upload-metadata')??'';
  if(!UUID.test(retryKey)||encoded.length>4096)throw new UploadError('invalid-metadata');
  let metadata:AssignmentReviewUploadMetadata;
  try{metadata=JSON.parse(decodeURIComponent(encoded));}catch{throw new UploadError('invalid-metadata');}
  if(!metadata||typeof metadata!=='object'||Array.isArray(metadata)||Object.keys(metadata).length!==6||
    !UUID.test(metadata.submissionId)||typeof metadata.fileName!=='string'||!metadata.fileName.trim()||
    metadata.fileName.length>255||/[\u0000-\u001f\u007f/\\]/.test(metadata.fileName)||
    typeof metadata.mimeType!=='string'||!AUDIO.has(metadata.mimeType.toLowerCase())||
    request.headers.get('content-type')!==metadata.mimeType||!Number.isSafeInteger(metadata.size)||metadata.size<1||
    (metadata.status!=='approved'&&metadata.status!=='rejected')||
    (metadata.reviewerNote!==null&&(typeof metadata.reviewerNote!=='string'||metadata.reviewerNote.length>1200))
  )throw new UploadError('invalid-metadata');
  metadata={...metadata,mimeType:metadata.mimeType.toLowerCase(),reviewerNote:metadata.reviewerNote?.trim()||null};
  if(metadata.size>MAX_ASSIGNMENT_REVIEW_AUDIO_BYTES)throw new UploadError('size-exceeded',413);
  const length=request.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)!==metadata.size))throw new UploadError('size-mismatch');
  if(!request.body)throw new UploadError('empty-body');
  return{retryKey,metadata};
}

function assertOwned(r:AssignmentReviewReservation,a:AssignmentReviewActor,m:AssignmentReviewUploadMetadata,bucket:string){
  if(!r.submissionId||r.submissionId!==m.submissionId||!r.assignmentId||!UUID.test(r.assignmentId)||
    !r.fileVersionId||!UUID.test(r.fileVersionId)||
    !r.lease||!UUID.test(r.lease)||r.choirId!==a.choirId||r.bucket!==bucket||r.objectKey!==
      `choirs/${a.choirId}/assignments/${r.assignmentId}/submissions/${m.submissionId}/reviews/${r.fileVersionId}/content`
  )throw new UploadError('invalid-reservation',502);
}

/** Auth -> exclusive reservation -> constant-memory signed PUT/readback -> atomic review commit. */
export function createAssignmentReviewUploadHandler(deps:AssignmentReviewUploadDependencies){return async(request:Request)=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  if(request.method!=='POST')return json({error:'method-not-allowed'},405);
  if(!deps.enabled)return json({error:'upload-unavailable'},503);
  let cleanup:(()=>Promise<Response|null>)|undefined,tracked:ReturnType<typeof verifiedStream>|undefined,putConfirmed=false;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90_000),abort=()=>controller.abort();
  request.signal.addEventListener('abort',abort,{once:true});
  try{
    const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')??'')?.[1];
    if(!token)throw new UploadError('unauthorized',401);
    const{metadata,retryKey}=parseAssignmentReviewUpload(request),actor=await deps.authorize(token);
    const transact=(action:'reserve'|'commit'|'cleanup'|'failed',lease?:string,sha256?:string)=>
      deps.transact({action,actor,retryKey,metadata,lease,sha256});
    const reservation=await transact('reserve');
    if(reservation.state==='committed')return json({submission:reservation.submission,fileVersionId:reservation.fileVersionId,replayed:true});
    if(reservation.state!=='uploading')throw new UploadError('upload-pending',409);
    assertOwned(reservation,actor,metadata,deps.bucket);
    cleanup=async()=>{try{
      const state=await transact('cleanup',reservation.lease);
      if(state.state==='committed')return json({submission:state.submission,fileVersionId:state.fileVersionId,replayed:true});
      if(state.state!=='cleanup'||!putConfirmed)throw new Error('Cleanup not safe');
      const removed=await deps.object({reservation,method:'DELETE',metadata,signal:AbortSignal.timeout(15_000)});
      await removed.body?.cancel();if(!removed.ok&&removed.status!==404)throw new Error('Cleanup failed');
      await transact('failed',reservation.lease);return null;
    }catch{return json({error:'upload-reconciliation-required',retryKey},503);}};
    tracked=verifiedStream(request.body!,metadata);
    const uploaded=await deps.object({reservation,method:'PUT',metadata,body:tracked.stream,signal:controller.signal});
    await uploaded.body?.cancel();if(!uploaded.ok)throw new UploadError('provider-upload-failed',502);
    putConfirmed=true;const uploadSha256=tracked.assertFinished();
    const readback=await deps.object({reservation,method:'GET',metadata,signal:controller.signal});
    if(readback.status!==200||readback.headers.get('content-type')!==metadata.mimeType||
      readback.headers.get('content-length')!==String(metadata.size)||!readback.body){
      await readback.body?.cancel();throw new UploadError('provider-verification-failed',502);
    }
    const verified=verifiedStream(readback.body,{...metadata,sha256:uploadSha256}),reader=verified.stream.getReader();
    while(!(await reader.read()).done){}verified.assertFinished();
    const committed=await transact('commit',reservation.lease,uploadSha256);
    if(committed.state!=='committed'||!committed.submission||!committed.fileVersionId)throw new UploadError('commit-failed',502);
    return json({submission:committed.submission,fileVersionId:committed.fileVersionId,replayed:false},201);
  }catch(error){controller.abort();await tracked?.cancel();const recovered=await cleanup?.();if(recovered)return recovered;
    return error instanceof UploadError?json({error:error.code},error.status):json({error:'upload-failed'},502);
  }finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);if(!request.bodyUsed)await request.body?.cancel().catch(()=>undefined);}
};}

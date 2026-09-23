import{UploadError}from'../repertoire-upload/stream.ts';
import type{CommentActor}from'../repertoire-comment-upload/handler.ts';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VOICES=new Set(['Soprano','Alto','Tenor','Bass']);
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, idempotency-key','Cache-Control':'private, no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
export interface CommentDeleteResult{state:'deleting'|'deleted';commentId:string;fileVersionId?:string|null;choirId:string;bucket?:string|null;objectKey?:string|null;lease:string}
export interface CommentLifecycleDependencies{enabled:boolean;bucket:string;authorize(token:string):Promise<CommentActor>;
  create(input:{actor:CommentActor;commentId:string;songId:string;contentHtml:string;targetVoiceGroup:string|null}):Promise<Record<string,unknown>>;
  transact(input:{action:'reserve'|'finalize';actor:CommentActor;retryKey:string;commentId:string;lease?:string}):Promise<CommentDeleteResult>;
  remove(input:{result:CommentDeleteResult;signal:AbortSignal}):Promise<Response>}
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:CORS});
async function boundedJson(request:Request){const length=request.headers.get('content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>70_000))throw new UploadError('invalid-request');let value:unknown;try{value=await request.json();}catch{throw new UploadError('invalid-request');}if(!value||typeof value!=='object'||Array.isArray(value))throw new UploadError('invalid-request');return value as Record<string,unknown>;}
function assertDelete(result:CommentDeleteResult,actor:CommentActor,commentId:string,bucket:string){
  if(result.state!=='deleting'||result.commentId!==commentId||result.choirId!==actor.choirId||!result.fileVersionId||!UUID.test(result.fileVersionId)||result.bucket!==bucket||typeof result.objectKey!=='string'||
    !result.objectKey.startsWith(`choirs/${actor.choirId}/repertoire/`)||!result.objectKey.endsWith(`/comments/${commentId}/audio/${result.fileVersionId}/content`)||/(^|\/)\.{1,2}(\/|$)/.test(result.objectKey)||result.objectKey.includes('//')||!UUID.test(result.lease))throw new UploadError('invalid-lifecycle-result',502);
}
export function createCommentLifecycleHandler(deps:CommentLifecycleDependencies){return async(request:Request)=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  if(request.method!=='POST'&&request.method!=='DELETE')return json({error:'method-not-allowed'},405);
  if(!deps.enabled)return json({error:'lifecycle-unavailable'},503);
  let productDeleted=false;
  try{const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')??'')?.[1];if(!token)throw new UploadError('unauthorized',401);const actor=await deps.authorize(token),body=await boundedJson(request);
    if(request.method==='POST'){
      if(Object.keys(body).length!==4||typeof body.commentId!=='string'||!UUID.test(body.commentId)||typeof body.songId!=='string'||!UUID.test(body.songId)||typeof body.contentHtml!=='string'||body.contentHtml.length>65_536||(body.targetVoiceGroup!==null&&(typeof body.targetVoiceGroup!=='string'||!VOICES.has(body.targetVoiceGroup))))throw new UploadError('invalid-request');
      const comment=await deps.create({actor,commentId:body.commentId,songId:body.songId,contentHtml:body.contentHtml,targetVoiceGroup:body.targetVoiceGroup as string|null});return json({comment},201);
    }
    if(Object.keys(body).length!==1||typeof body.commentId!=='string'||!UUID.test(body.commentId))throw new UploadError('invalid-request');const retryKey=request.headers.get('idempotency-key')??'';if(!UUID.test(retryKey))throw new UploadError('invalid-request');
    const reservation=await deps.transact({action:'reserve',actor,retryKey,commentId:body.commentId});
    if(reservation.state==='deleted')return json({deleted:true,cleanupPending:false,replayed:true});
    productDeleted=true;assertDelete(reservation,actor,body.commentId,deps.bucket);
    const removed=await deps.remove({result:reservation,signal:AbortSignal.timeout(15_000)});await removed.body?.cancel();
    if(!removed.ok&&removed.status!==404)return json({deleted:true,cleanupPending:true},202);
    const finalized=await deps.transact({action:'finalize',actor,retryKey,commentId:body.commentId,lease:reservation.lease});
    if(finalized.state!=='deleted')throw new UploadError('invalid-lifecycle-result',502);return json({deleted:true,cleanupPending:false,replayed:false});
  }catch(error){if(productDeleted)return json({deleted:true,cleanupPending:true},202);return error instanceof UploadError?json({error:error.code},error.status):json({error:'lifecycle-failed'},502);}
};}

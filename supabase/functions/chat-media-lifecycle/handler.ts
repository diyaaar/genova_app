import{UploadError}from'../repertoire-upload/stream.ts';import type{ChatMediaActor,ChatMediaTarget}from'../chat-media-upload/handler.ts';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, idempotency-key','Cache-Control':'private, no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
export interface LifecycleResult{state:'committed'|'aborting'|'aborted'|'deleting'|'deleted';batchId?:string;messageId?:string;choirId?:string;roomId?:string;lease?:string;targets?:ChatMediaTarget[]}
export interface ChatMediaLifecycleDependencies{enabled:boolean;authorize(token:string):Promise<ChatMediaActor>;
  abort(input:{action:'reserve'|'finalize';actor:ChatMediaActor;retryKey:string;batchId:string;lease?:string}):Promise<LifecycleResult>;
  removeMessage(input:{action:'reserve'|'finalize';actor:ChatMediaActor;retryKey:string;messageId:string;lease?:string}):Promise<LifecycleResult>;
  remove(target:ChatMediaTarget,signal:AbortSignal):Promise<Response>}
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:CORS});
async function body(request:Request){const length=request.headers.get('content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>2000))throw new UploadError('invalid-request');try{const value=await request.json();if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value as Record<string,unknown>;}catch{throw new UploadError('invalid-request');}}
function validTargets(result:LifecycleResult,actor:ChatMediaActor){if(!Array.isArray(result.targets)||!result.lease||!UUID.test(result.lease))throw new UploadError('invalid-lifecycle-result',502);for(const target of result.targets){if(!target.fileVersionId||!UUID.test(target.fileVersionId)||typeof target.bucket!=='string'||typeof target.objectKey!=='string'||!target.objectKey.startsWith(`choirs/${actor.choirId}/chat/`)||/(^|\/)\.{1,2}(\/|$)/.test(target.objectKey)||target.objectKey.includes('//'))throw new UploadError('invalid-lifecycle-result',502);}}
export function createChatMediaLifecycleHandler(deps:ChatMediaLifecycleDependencies){return async(request:Request)=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});if(request.method!=='POST'&&request.method!=='DELETE')return json({error:'method-not-allowed'},405);if(!deps.enabled)return json({error:'lifecycle-unavailable'},503);
  let productChanged=false;
  try{const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')??'')?.[1];if(!token)throw new UploadError('unauthorized',401);const actor=await deps.authorize(token),payload=await body(request),retryKey=request.headers.get('idempotency-key')??'';if(!UUID.test(retryKey))throw new UploadError('invalid-request');
    const isAbort=request.method==='POST';const id=isAbort?payload.batchId:payload.messageId;if(Object.keys(payload).length!==1||typeof id!=='string'||!UUID.test(id))throw new UploadError('invalid-request');
    const transact=(action:'reserve'|'finalize',lease?:string)=>isAbort?deps.abort({action,actor,retryKey,batchId:id,lease}):deps.removeMessage({action,actor,retryKey,messageId:id,lease});
    const reservation=await transact('reserve');
    if(reservation.state==='committed')return json({committed:true,batchId:reservation.batchId},409);
    if(reservation.state==='aborted'||reservation.state==='deleted')return json({deleted:true,cleanupPending:false,replayed:true});
    productChanged=true;validTargets(reservation,actor);
    let pending=false;for(const target of reservation.targets!){const response=await deps.remove(target,AbortSignal.timeout(15_000));await response.body?.cancel();if(!response.ok&&response.status!==404)pending=true;}
    if(pending)return json({deleted:true,cleanupPending:true},202);
    const finalized=await transact('finalize',reservation.lease);if(finalized.state!=='aborted'&&finalized.state!=='deleted')throw new UploadError('invalid-lifecycle-result',502);
    return json({deleted:true,cleanupPending:false,replayed:false});
  }catch(error){if(productChanged)return json({deleted:true,cleanupPending:true},202);return error instanceof UploadError?json({error:error.code},error.status):json({error:'lifecycle-failed'},502);}
};}

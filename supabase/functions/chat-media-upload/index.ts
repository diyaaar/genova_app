import{createClient}from'npm:@supabase/supabase-js@2.112.4';
import{AwsClient}from'npm:aws4fetch@1.0.20';
import{authorizeAssignmentActor,requiredEnv}from'../assignment-upload/auth.ts';
import{makeR2ObjectUrl,parseR2Jurisdiction}from'../repertoire-file/r2.ts';
import{UploadError}from'../repertoire-upload/stream.ts';
import{sendSignedUpload}from'../repertoire-upload/transport.ts';
import{createChatMediaUploadHandler}from'./handler.ts';
const mode=Deno.env.get('CHAT_STORAGE_MODE')??'legacy',bucket=Deno.env.get('R2_BUCKET')??'';
const admin=()=>createClient(requiredEnv('SUPABASE_URL'),requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15_000)})}});
Deno.serve(createChatMediaUploadHandler({enabled:Deno.env.get('CHAT_R2_MEDIA_ENABLED')==='true'&&(mode==='mixed'||mode==='r2-required'),bucket,authorize:authorizeAssignmentActor,
  async transact({action,actor,retryKey,metadata,lease,sha256}){const{data,error}=await admin().rpc('chat_media_upload_060',{p_action:action,p_actor_id:actor.userId,p_session_id:actor.sessionId,p_choir_id:actor.choirId,p_retry_key:retryKey,p_metadata:metadata,p_bucket:bucket,p_lease:lease??null,p_sha256:sha256??null});if(error)throw new UploadError(error.code==='42501'?'forbidden':error.code==='23505'?'upload-conflict':'upload-transaction-failed',error.code==='42501'?403:error.code==='23505'?409:502);if(!data||typeof data!=='object')throw new Error('Invalid transaction response');return data;},
  async object({target,method,metadata,body,signal}){const jurisdiction=parseR2Jurisdiction(Deno.env.get('R2_JURISDICTION'));if(jurisdiction===null||target.bucket!==bucket||!target.objectKey)throw new Error('Invalid R2 target');const url=makeR2ObjectUrl({accountId:requiredEnv('R2_ACCOUNT_ID'),jurisdiction,bucket,objectKey:target.objectKey,testEndpoint:Deno.env.get('R2_TEST_ENDPOINT'),allowInsecureLoopback:Deno.env.get('R2_ALLOW_INSECURE_LOOPBACK')==='true'});if(!url)throw new Error('Invalid R2 target');const client=new AwsClient({service:'s3',region:'auto',retries:0,accessKeyId:requiredEnv('R2_ACCESS_KEY_ID'),secretAccessKey:requiredEnv('R2_SECRET_ACCESS_KEY')});const headers=new Headers({'X-Amz-Content-Sha256':'UNSIGNED-PAYLOAD'});if(method==='PUT'){headers.set('Content-Type',metadata.mimeType);headers.set('Content-Length',String(metadata.size));}const signed=await client.sign(url,{method,headers,body,redirect:'manual',signal});return method==='PUT'?sendSignedUpload(signed):fetch(signed);}
}));

import assert from 'node:assert/strict';
import { createHash,createHmac,randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer,type IncomingMessage,type ServerResponse } from 'node:http';
const mockOrigin='http://127.0.0.1:18055',edgeOrigin='http://127.0.0.1:8000';
const serviceKey='055-synthetic-service',accessKey='055SYNTHETICACCESS',secretKey='055-synthetic-r2-secret';
const choirId='20000000-0000-4000-8000-000000000055',userId='10000000-0000-4000-8000-000000000055';
const sessionId='70000000-0000-4000-8000-000000000055';
const token=`synthetic.${Buffer.from(JSON.stringify({session_id:sessionId})).toString('base64url')}.signature`;
const hash=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const objects=new Set<string>(),jobs=new Map<string,{state:'cleanup'|'cleaned';fileId:string;objectKey:string}>();
const hits:string[]=[];let providerFailure=false;
function json(response:ServerResponse,status:number,value:unknown){response.writeHead(status,{'content-type':'application/json'});response.end(JSON.stringify(value));}
async function body(request:IncomingMessage){const chunks:Buffer[]=[];for await(const chunk of request)chunks.push(Buffer.from(chunk));return Buffer.concat(chunks);}
function verifySignature(request:IncomingMessage,url:URL){const auth=request.headers.authorization??'';
 const match=/^AWS4-HMAC-SHA256 Credential=([^/]+)\/([^,]+), SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/.exec(auth);assert.ok(match);assert.equal(match[1],accessKey);
 const [, ,scope,signedHeaders,signature]=match;const headers=signedHeaders.split(';').map(name=>`${name}:${String(request.headers[name]??'').trim().replace(/\s+/g,' ')}`).join('\n');
 const payload=String(request.headers['x-amz-content-sha256']??hash(''));const canonical=[request.method,url.pathname,url.searchParams.toString(),`${headers}\n`,signedHeaders,payload].join('\n');
 const text=['AWS4-HMAC-SHA256',request.headers['x-amz-date'],scope,hash(canonical)].join('\n');const [date,region,service]=scope.split('/');let key:Buffer=Buffer.from(`AWS4${secretKey}`);
 for(const part of [date,region,service,'aws4_request'])key=createHmac('sha256',key).update(part).digest();assert.equal(signature,createHmac('sha256',key).update(text).digest('hex'));}
const server=createServer(async(request,response)=>{try{const url=new URL(request.url??'/',mockOrigin);
 if(url.pathname.startsWith('/genova-private/')){verifySignature(request,url);hits.push(request.method??'');assert.equal(request.method,'DELETE');
  if(providerFailure){response.writeHead(500);response.end();return;}objects.delete(url.pathname);response.writeHead(204);response.end();return;}
 if(url.pathname==='/auth/v1/user'){if(request.headers.authorization!==`Bearer ${token}`)return json(response,401,{message:'bad'});return json(response,200,{id:userId,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},identities:[],created_at:'2026-09-22T00:00:00Z'});}
 if(url.pathname==='/rest/v1/rpc/current_choir_id')return json(response,200,choirId);
 if(url.pathname==='/rest/v1/rpc/repertoire_lifecycle_055'){assert.equal(request.headers.authorization,`Bearer ${serviceKey}`);const p=JSON.parse((await body(request)).toString());assert.equal(p.p_actor_id,userId);assert.equal(p.p_session_id,sessionId);assert.equal(p.p_choir_id,choirId);
  if(p.p_target_id==='30000000-0000-4000-8000-000000000099')return json(response,400,{code:'P5501',message:'annotated'});
  if(p.p_action==='check-replace')return json(response,200,{state:'ready'});
  let job=jobs.get(p.p_target_id);if(!job){const fileId=p.p_target_id,objectKey=`choirs/${choirId}/repertoire/${fileId}/content`;job={state:'cleanup',fileId,objectKey};jobs.set(p.p_target_id,job);objects.add(`/genova-private/${objectKey}`);}
  if(p.p_action==='cleaned')job.state='cleaned';return json(response,200,{state:job.state,targetType:'file',targetId:p.p_target_id,targets:[{fileId:job.fileId,bucket:'genova-private',objectKey:job.objectKey}]});}
 return json(response,404,{message:'missing'});
 }catch(error){console.error('055 synthetic assertion',String(error));json(response,500,{message:String(error)});}});
function request(method:'POST'|'DELETE',targetId:string){return fetch(edgeOrigin,{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json','idempotency-key':randomUUID()},body:JSON.stringify({targetType:'file',targetId,mode:method==='POST'?'replacement':'delete'})});}
async function main(){await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(18055,'127.0.0.1',resolve)});
 const edge=spawn('deno',['run','--allow-env','--allow-net=0.0.0.0:8000,127.0.0.1:18055','supabase/functions/repertoire-file-lifecycle/index.ts'],{env:{NODE_ENV:'test',PATH:process.env.PATH,HOME:process.env.HOME,SUPABASE_URL:mockOrigin,SUPABASE_ANON_KEY:'055-anon',SUPABASE_SERVICE_ROLE_KEY:serviceKey,REPERTOIRE_STORAGE_MODE:'r2-required',REPERTOIRE_R2_UPLOAD_ENABLED:'true',R2_ACCOUNT_ID:'0123456789abcdef0123456789abcdef',R2_BUCKET:'genova-private',R2_ACCESS_KEY_ID:accessKey,R2_SECRET_ACCESS_KEY:secretKey,R2_TEST_ENDPOINT:`${mockOrigin}/`,R2_ALLOW_INSECURE_LOOPBACK:'true'},stdio:['ignore','pipe','pipe']});let output='';edge.stdout.on('data',c=>{output+=String(c).slice(0,2000)});edge.stderr.on('data',c=>{output+=String(c).slice(0,2000)});
 try{let ready=false;for(let i=0;i<40;i++){if(edge.exitCode!==null)throw new Error(`Edge exited ${edge.exitCode}`);try{if((await fetch(edgeOrigin,{method:'OPTIONS'})).status===204){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert.ok(ready,'Edge did not start');
  const fileA='30000000-0000-4000-8000-000000000055';assert.equal((await request('POST',fileA)).status,200);assert.equal(hits.length,0);
  assert.equal((await request('DELETE',fileA)).status,200);assert.equal(hits.length,1);assert.ok(!objects.has(`/genova-private/choirs/${choirId}/repertoire/${fileA}/content`));
  assert.equal((await request('DELETE',fileA)).status,200);assert.equal(hits.length,1,'cleaned replay touched provider');
  const fileB='30000000-0000-4000-8000-000000000056';providerFailure=true;const pending=await request('DELETE',fileB);assert.equal(pending.status,202);assert.deepEqual(await pending.json(),{deleted:true,cleanupPending:true});providerFailure=false;
  assert.equal((await request('DELETE',fileB)).status,200);assert.equal(jobs.get(fileB)?.state,'cleaned');
  assert.equal((await request('POST','30000000-0000-4000-8000-000000000099')).status,409);
  console.log(`PASS actual signed delete/preflight/replay/reconciliation; signed_provider_requests=${hits.length}`);
 }catch(error){process.stderr.write(output.replaceAll(serviceKey,'[redacted]').replaceAll(secretKey,'[redacted]'));throw error;}finally{edge.kill('SIGTERM');await Promise.race([new Promise<void>(r=>edge.once('exit',()=>r())),new Promise<void>(r=>setTimeout(r,2000))]);if(edge.exitCode===null&&edge.signalCode===null)edge.kill('SIGKILL');server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}}
main().catch(error=>{console.error(error);process.exitCode=1});

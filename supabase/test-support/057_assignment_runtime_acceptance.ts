import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const mockOrigin='http://127.0.0.1:18055',edgeOrigin='http://127.0.0.1:8000';
const serviceKey='057-synthetic-service-key',accessKey='057SYNTHETICACCESS',secretKey='057-synthetic-r2-secret';
const choirId='20000000-0000-4000-8000-000000000057',userId='10000000-0000-4000-8000-000000000057';
const assignmentId='50000000-0000-4000-8000-000000000057',submissionId='30000000-0000-4000-8000-000000000057';
const sessionId='70000000-0000-4000-8000-000000000057';
const token=`synthetic.${Buffer.from(JSON.stringify({session_id:sessionId})).toString('base64url')}.signature`;
const wav=Buffer.concat([Buffer.from('RIFF'),Buffer.from([40,0,0,0]),Buffer.from('WAVEfmt '),
  Buffer.from([16,0,0,0,1,0,1,0,64,31,0,0,128,62,0,0,2,0,16,0]),Buffer.from('data'),Buffer.from([4,0,0,0,0,0,1,0])]);
const binary=Buffer.from([0,1,2,3,4,5,6,7,8]);
const digest=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
type Stored={bytes:Buffer;mime:string};type Upload={metadata:any;state:string;versionId:string;lease:string;objectKey:string;submission?:any};
const objects=new Map<string,Stored>(),uploads=new Map<string,Upload>(),versions=new Map<string,any>(),hits:string[]=[];
let failReadback=false,loseCommitResponse=false;

function json(response:ServerResponse,status:number,value:unknown){response.writeHead(status,{'content-type':'application/json'});response.end(JSON.stringify(value));}
async function readBody(request:IncomingMessage){const chunks:Buffer[]=[];let size=0;for await(const chunk of request){
  const bytes=Buffer.from(chunk);size+=bytes.length;assert.ok(size<1048576);chunks.push(bytes);}return Buffer.concat(chunks);}
function verifySignature(request:IncomingMessage,url:URL){const auth=request.headers.authorization??'';
  const match=/^AWS4-HMAC-SHA256 Credential=([^/]+)\/([^,]+), SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/.exec(auth);
  assert.ok(match);assert.equal(match[1],accessKey);const[,,scope,signedHeaders,signature]=match;
  const headers=signedHeaders.split(';').map(name=>`${name}:${String(request.headers[name]??'').trim().replace(/\s+/g,' ')}`).join('\n');
  const canonical=[request.method,url.pathname,'',`${headers}\n`,signedHeaders,'UNSIGNED-PAYLOAD'].join('\n');
  const text=['AWS4-HMAC-SHA256',request.headers['x-amz-date'],scope,digest(canonical)].join('\n');
  const[date,region,service]=scope.split('/');let key:Buffer=Buffer.from(`AWS4${secretKey}`);
  for(const part of[date,region,service,'aws4_request'])key=createHmac('sha256',key).update(part).digest();
  assert.equal(signature,createHmac('sha256',key).update(text).digest('hex'));assert.equal(url.search,'');}
const server=createServer(async(request,response)=>{try{const url=new URL(request.url??'/',mockOrigin);
  if(url.pathname.startsWith('/genova-private/')){verifySignature(request,url);hits.push(request.method??'');
    assert.match(url.pathname,new RegExp(`^/genova-private/choirs/${choirId}/assignments/${assignmentId}/submissions/[a-f0-9-]+/content$`));
    if(request.method==='PUT'){const bytes=await readBody(request);assert.equal(bytes.length,Number(request.headers['content-length']));
      objects.set(url.pathname,{bytes,mime:String(request.headers['content-type'])});response.writeHead(200);response.end();return;}
    if(request.method==='DELETE'){objects.delete(url.pathname);response.writeHead(204);response.end();return;}
    const object=objects.get(url.pathname);assert.ok(object);const range=/^bytes=(\d+)-(\d+)$/.exec(String(request.headers.range??''));
    const content=range?object.bytes.subarray(Number(range[1]),Number(range[2])+1):object.bytes;
    const headers:Record<string,string|number>={'content-type':failReadback?'text/html':object.mime,'content-length':content.length};
    if(range)headers['content-range']=`bytes ${range[1]}-${range[2]}/${object.bytes.length}`;
    response.writeHead(range?206:200,headers);if(request.method==='HEAD')response.end();else response.end(content);return;}
  if(url.pathname==='/auth/v1/user'){if(request.headers.authorization!==`Bearer ${token}`)return json(response,401,{message:'Invalid'});
    return json(response,200,{id:userId,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},identities:[],created_at:'2026-09-22T00:00:00Z'});}
  if(url.pathname==='/rest/v1/rpc/current_choir_id')return json(response,200,choirId);
  if(url.pathname==='/rest/v1/rpc/assignment_submission_upload_057'){assert.equal(request.headers.authorization,`Bearer ${serviceKey}`);
    const p=JSON.parse((await readBody(request)).toString());assert.equal(p.p_actor_id,userId);assert.equal(p.p_session_id,sessionId);
    assert.equal(p.p_choir_id,choirId);assert.equal(p.p_metadata.assignmentId,assignmentId);let upload=uploads.get(p.p_retry_key);const existed=Boolean(upload);
    if(!upload){assert.equal(p.p_action,'reserve');const versionId=randomUUID();upload={metadata:p.p_metadata,state:'uploading',versionId,
      lease:randomUUID(),objectKey:`choirs/${choirId}/assignments/${assignmentId}/submissions/${versionId}/content`};uploads.set(p.p_retry_key,upload);}
    if(JSON.stringify(upload.metadata)!==JSON.stringify(p.p_metadata))return json(response,409,{code:'23505'});
    if(p.p_action!=='reserve')assert.equal(p.p_lease,upload.lease);
    if(p.p_action==='commit'){const stored=objects.get(`/genova-private/${upload.objectKey}`);assert.ok(stored);assert.equal(digest(stored.bytes),p.p_sha256);
      upload.state='committed';upload.submission={id:submissionId,assignment_id:assignmentId,member_id:'member',drive_file_id:`r2_${upload.versionId}`,
        current_file_version_id:upload.versionId,file_name:p.p_metadata.fileName,mime_type:p.p_metadata.mimeType,file_size_bytes:p.p_metadata.size};
      versions.set(upload.versionId,{id:upload.versionId,choir_id:choirId,assignment_id:assignmentId,submission_id:submissionId,member_id:'member',provider:'r2',
        bucket:'genova-private',object_key:upload.objectKey,content_length:p.p_metadata.size,mime_type:p.p_metadata.mimeType,
        sha256_hex:p.p_sha256,file_name:p.p_metadata.fileName,created_at:new Date().toISOString()});
      if(loseCommitResponse)return json(response,500,{message:'lost'});}
    if(upload.state==='committed')return json(response,200,{state:'committed',submission:upload.submission,fileVersionId:upload.versionId});
    if(p.p_action==='cleanup')upload.state='cleanup';if(p.p_action==='failed')upload.state='failed';
    return json(response,200,{...upload,submissionId,fileVersionId:upload.versionId,choirId,bucket:'genova-private',state:existed&&p.p_action==='reserve'?'pending':upload.state});}
  if(url.pathname==='/rest/v1/assignment_submission_file_versions'){
    const id=url.searchParams.get('id')?.replace('eq.','')??'';const version=versions.get(id);
    if(request.headers.authorization!==`Bearer ${serviceKey}`&&request.headers.authorization!==`Bearer ${token}`)return json(response,401,{message:'Invalid'});
    return version?json(response,200,version):json(response,200,null);}
  return json(response,404,{message:'No mock route'});
}catch(error){console.error('057 runtime assertion:',String(error));json(response,500,{message:String(error)});}});

function spawnEdge(entry:string,extra:Record<string,string>){return spawn('deno',['run','--allow-env','--allow-net=0.0.0.0:8000,127.0.0.1:18055',entry],{
  env:{NODE_ENV:'test',PATH:process.env.PATH,HOME:process.env.HOME,SUPABASE_URL:mockOrigin,SUPABASE_ANON_KEY:'057-anon',
    SUPABASE_SERVICE_ROLE_KEY:serviceKey,R2_ACCOUNT_ID:'0123456789abcdef0123456789abcdef',R2_BUCKET:'genova-private',
    R2_ACCESS_KEY_ID:accessKey,R2_SECRET_ACCESS_KEY:secretKey,R2_TEST_ENDPOINT:`${mockOrigin}/`,R2_ALLOW_INSECURE_LOOPBACK:'true',...extra},
  stdio:['ignore','pipe','pipe']});}
type EdgeProcess=ReturnType<typeof spawnEdge>;
async function ready(edge:EdgeProcess){let output='';edge.stdout.on('data',chunk=>output+=String(chunk).slice(0,2000));edge.stderr.on('data',chunk=>output+=String(chunk).slice(0,2000));
  for(let i=0;i<50;i++){if(edge.exitCode!==null)throw new Error(`Edge exited ${edge.exitCode}: ${output}`);try{if((await fetch(edgeOrigin,{method:'OPTIONS'})).status===204)return;}catch{/*starting*/}
    await new Promise(resolve=>setTimeout(resolve,100));}throw new Error(`Edge did not start: ${output}`);}
async function stop(edge:EdgeProcess){edge.kill('SIGTERM');await Promise.race([new Promise<void>(resolve=>edge.once('exit',()=>resolve())),new Promise(resolve=>setTimeout(resolve,2000))]);
  if(edge.exitCode===null&&edge.signalCode===null)edge.kill('SIGKILL');}
async function upload(bytes:Buffer,mime:string,key=randomUUID()){const metadata={assignmentId,fileName:mime==='audio/wav'?'take.wav':'exercise.bin',mimeType:mime,size:bytes.length,note:'synthetic'};
  return fetch(edgeOrigin,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':mime,
    'x-upload-metadata':encodeURIComponent(JSON.stringify(metadata)),'idempotency-key':key},body:Uint8Array.from(bytes)});}

async function main(){await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(18055,'127.0.0.1',resolve);});let edge:EdgeProcess|undefined;
  try{edge=spawnEdge('supabase/functions/assignment-upload/index.ts',{ASSIGNMENT_STORAGE_MODE:'r2-required',ASSIGNMENT_R2_UPLOAD_ENABLED:'true'});await ready(edge);
    for(const[bytes,mime]of[[wav,'audio/wav'],[binary,'application/octet-stream']]as const){const key=randomUUID();const result=await upload(bytes,mime,key);
      assert.equal(result.status,201,await result.clone().text());const payload=await result.json();assert.equal(payload.submission.current_file_version_id,payload.fileVersionId);
      const count=hits.length;assert.equal((await upload(bytes,mime,key)).status,200);assert.equal(hits.length,count);console.log(`PASS signed assignment upload/readback/replay ${mime} sha256=${digest(bytes)}`);}
    const before=objects.size;failReadback=true;assert.equal((await upload(wav,'audio/wav')).status,502);assert.equal(objects.size,before);assert.equal(hits.at(-1),'DELETE');
    failReadback=false;loseCommitResponse=true;assert.equal((await upload(wav,'audio/wav')).status,200);assert.equal(objects.size,before+1);assert.equal(hits.at(-1),'GET');loseCommitResponse=false;
    console.log(`PASS provider mismatch cleanup and lost-commit recovery signed_requests=${hits.length}`);await stop(edge);edge=undefined;
    const readableVersion=[...versions.values()][0];edge=spawnEdge('supabase/functions/assignment-file/index.ts',{});await ready(edge);
    const ticketResponse=await fetch(edgeOrigin,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({fileId:readableVersion.id})});
    assert.equal(ticketResponse.status,200,await ticketResponse.clone().text());const ticket=await ticketResponse.json();const contentUrl=new URL(ticket.url,edgeOrigin);
    const content=await fetch(contentUrl,{headers:{range:'bytes=0-7'}});assert.equal(content.status,206);assert.deepEqual(Buffer.from(await content.arrayBuffer()),objects.get(`/genova-private/${readableVersion.object_key}`)!.bytes.subarray(0,8));
    assert.equal((await fetch(`${edgeOrigin}?fileId=${readableVersion.id}`)).status,401);
    console.log('PASS authorized assignment version ticket/range read and raw-id refusal');
  }finally{if(edge)await stop(edge);server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}}
main().catch(error=>{console.error(error);process.exitCode=1;});

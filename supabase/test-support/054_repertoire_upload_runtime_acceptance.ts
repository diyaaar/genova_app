import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const mockOrigin = 'http://127.0.0.1:18055';
const edgeOrigin = 'http://127.0.0.1:8000';
const serviceKey = '054-synthetic-service-key';
const accessKey = '054SYNTHETICACCESS';
const secretKey = '054-synthetic-r2-secret';
const choirId = '20000000-0000-4000-8000-000000000054';
const userId = '10000000-0000-4000-8000-000000000054';
const songId = '50000000-0000-4000-8000-000000000054';
const sessionId = '70000000-0000-4000-8000-000000000054';
const token = `synthetic.${Buffer.from(JSON.stringify({ session_id: sessionId })).toString('base64url')}.signature`;
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.from([40,0,0,0]), Buffer.from('WAVEfmt '),
  Buffer.from([16,0,0,0,1,0,1,0,64,31,0,0,128,62,0,0,2,0,16,0]), Buffer.from('data'), Buffer.from([4,0,0,0,0,0,1,0])]);
const png = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0,0x49,0x45,0x4e,0x44]);
const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const objects = new Map<string, { bytes: Buffer; mime: string }>();
const uploads = new Map<string, { metadata: unknown; state: string; fileId: string; lease: string; objectKey: string; file?: unknown }>();
const hits: string[] = [];
let failReadback = false;
let loseCommitResponse = false;

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(body));
}
async function body(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) { chunks.push(Buffer.from(chunk)); assert.ok(chunks.reduce((n,c) => n+c.length,0) < 1048576); }
  return Buffer.concat(chunks);
}
function verifySignature(request: IncomingMessage, url: URL) {
  const auth = request.headers.authorization ?? '';
  const match = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/([^,]+), SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/.exec(auth);
  assert.ok(match); assert.equal(match[1], accessKey);
  const [, , scope, signedHeaders, signature] = match;
  const headers = signedHeaders.split(';').map((name) => `${name}:${String(request.headers[name] ?? '').trim().replace(/\s+/g,' ')}`).join('\n');
  const canonical = [request.method,url.pathname,'',`${headers}\n`,signedHeaders,'UNSIGNED-PAYLOAD'].join('\n');
  const text = ['AWS4-HMAC-SHA256',request.headers['x-amz-date'],scope,hash(canonical)].join('\n');
  const [date,region,service] = scope.split('/');
  let key: Buffer = Buffer.from(`AWS4${secretKey}`);
  for (const part of [date,region,service,'aws4_request']) key = createHmac('sha256',key).update(part).digest();
  assert.equal(signature,createHmac('sha256',key).update(text).digest('hex'));
  assert.equal(url.search,'');
}
const server = createServer(async (request,response) => {
  try {
    const url = new URL(request.url ?? '/',mockOrigin);
    if (url.pathname.startsWith('/genova-private/')) {
      verifySignature(request,url); hits.push(request.method ?? '');
      assert.match(url.pathname, new RegExp(`^/genova-private/choirs/${choirId}/repertoire/[a-f0-9-]+/content$`));
      if (request.method === 'PUT') {
        const bytes = await body(request);
        assert.equal(bytes.length,Number(request.headers['content-length']));
        objects.set(url.pathname,{ bytes,mime: String(request.headers['content-type']) });
        response.writeHead(200); response.end(); return;
      }
      if (request.method === 'DELETE') { objects.delete(url.pathname); response.writeHead(204); response.end(); return; }
      const object = objects.get(url.pathname); assert.ok(object);
      response.writeHead(200,{ 'content-type': failReadback ? 'text/html' : object.mime,'content-length': object.bytes.length });
      response.end(object.bytes); return;
    }
    if (url.pathname === '/auth/v1/user') {
      if (request.headers.authorization !== `Bearer ${token}`) return json(response,401,{ message:'Invalid token' });
      return json(response,200,{ id:userId, aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},identities:[],created_at:'2026-09-21T00:00:00Z' });
    }
    if (url.pathname === '/rest/v1/rpc/current_choir_id') return json(response,200,choirId);
    if (url.pathname === '/rest/v1/rpc/repertoire_upload_054' || url.pathname === '/rest/v1/rpc/repertoire_cover_upload_056') {
      assert.equal(request.headers.authorization,`Bearer ${serviceKey}`);
      const p = JSON.parse((await body(request)).toString());
      assert.equal(p.p_actor_id,userId); assert.equal(p.p_session_id,sessionId); assert.equal(p.p_choir_id,choirId);
      assert.equal(p.p_bucket,'genova-private');
      if (p.p_metadata.songId !== songId) return json(response,403,{ code:'42501',message:'Denied' });
      let u = uploads.get(p.p_retry_key);
      const existed = Boolean(u);
      if (!u) {
        assert.equal(p.p_action,'reserve');
        const fileId = randomUUID();
        u = { state:'uploading',metadata:p.p_metadata,fileId,lease:randomUUID(),objectKey:`choirs/${choirId}/repertoire/${fileId}/content` };
        uploads.set(p.p_retry_key,u);
      }
      if (JSON.stringify(u.metadata) !== JSON.stringify(p.p_metadata)) return json(response,409,{ code:'23505',message:'Conflict' });
      if (p.p_action !== 'reserve') assert.equal(p.p_lease,u.lease);
      if (p.p_action === 'commit') {
        assert.equal(u.state,'uploading');
        const stored = objects.get(`/genova-private/${u.objectKey}`); assert.ok(stored);
        assert.equal(hash(stored.bytes),p.p_sha256);
        u.state = 'committed'; u.file = { id:u.fileId,song_id:songId,file_name:p.p_metadata.fileName,drive_download_link:null };
        if (loseCommitResponse) return json(response,500,{ message:'Lost response after commit' });
      }
      if (u.state === 'committed') return json(response,200,{ state:u.state,file:u.file });
      if (p.p_action === 'cleanup') u.state = 'cleanup';
      if (p.p_action === 'failed') u.state = 'failed';
      return json(response,200,{ ...u,bucket:'genova-private',choirId,state:existed && p.p_action === 'reserve' ? 'pending' : u.state });
    }
    json(response,404,{ message:'No such mock route' });
  } catch (error) {
    console.error('054 synthetic provider assertion:', String(error));
    json(response,500,{ message:String(error) });
  }
});

async function upload(bytes: Buffer, mimeType: string, key = randomUUID(), selectedSong = songId,
  options: { fileName?: string; fileType?: 'sheet'|'audio'|'other'; partitionLabel?: string|null } = {}) {
  const metadata = { songId:selectedSong,fileName:options.fileName ?? (mimeType === 'application/pdf' ? 'score.pdf' : 'rehearsal.wav'),
    fileType:options.fileType ?? (mimeType === 'application/pdf' ? 'sheet' : 'audio'),mimeType,size:bytes.length,
    partitionLabel:options.partitionLabel ?? null };
  return fetch(edgeOrigin,{ method:'POST',headers:{ authorization:`Bearer ${token}`,'content-type':mimeType,
    'x-upload-metadata':encodeURIComponent(JSON.stringify(metadata)),'idempotency-key':key },body:Uint8Array.from(bytes) });
}
async function main() {
  await new Promise<void>((resolve,reject) => { server.once('error',reject); server.listen(18055,'127.0.0.1',resolve); });
  const edge = spawn('deno',['run','--allow-env','--allow-net=0.0.0.0:8000,127.0.0.1:18055',
    'supabase/functions/repertoire-upload/index.ts'],{
    env:{ NODE_ENV:'test',PATH:process.env.PATH,HOME:process.env.HOME,SUPABASE_URL:mockOrigin,SUPABASE_ANON_KEY:'054-synthetic-anon',
      SUPABASE_SERVICE_ROLE_KEY:serviceKey,REPERTOIRE_STORAGE_MODE:'r2-required',REPERTOIRE_R2_UPLOAD_ENABLED:'true',
      R2_ACCOUNT_ID:'0123456789abcdef0123456789abcdef',R2_BUCKET:'genova-private',R2_ACCESS_KEY_ID:accessKey,
      R2_SECRET_ACCESS_KEY:secretKey,R2_TEST_ENDPOINT:`${mockOrigin}/`,R2_ALLOW_INSECURE_LOOPBACK:'true' },
    stdio:['ignore','pipe','pipe'],
  });
  let output = '';
  edge.stdout.on('data',c => { output += String(c).slice(0,2000); });
  edge.stderr.on('data',c => { output += String(c).slice(0,2000); });
  try {
    let ready = false;
    for (let i=0;i<40;i++) {
      if (edge.exitCode !== null) throw new Error(`Edge exited ${edge.exitCode}`);
      try { if ((await fetch(edgeOrigin,{ method:'OPTIONS' })).status === 204) { ready=true;break; } } catch { /* starting */ }
      await new Promise(r => setTimeout(r,100));
    }
    assert.ok(ready,'Edge did not start');
    for (const [bytes,mime] of [[pdf,'application/pdf'],[wav,'audio/wav']] as const) {
      const key = randomUUID();
      const result = await upload(bytes,mime,key);
      assert.equal(result.status,201,await result.text());
      const count = hits.length;
      assert.equal((await upload(bytes,mime,key)).status,200);
      assert.equal(hits.length,count,'Replay touched provider');
      const changed = Buffer.concat([bytes,Buffer.from('different')]);
      assert.equal((await upload(changed,mime,key)).status,409);
      console.log(`PASS signed HTTP upload/readback/replay ${mime} bytes=${bytes.length} sha256=${hash(bytes)}`);
    }
    const coverKey=randomUUID();
    const coverOptions={fileName:'cover.png',fileType:'other' as const,partitionLabel:'__cover__'};
    assert.equal((await upload(png,'image/png',coverKey,songId,coverOptions)).status,201);
    const coverHits=hits.length;
    assert.equal((await upload(png,'image/png',coverKey,songId,coverOptions)).status,200);
    assert.equal(hits.length,coverHits,'Cover replay touched provider');
    console.log(`PASS signed private cover upload/readback/replay image/png bytes=${png.length} sha256=${hash(png)}`);
    const before = objects.size;
    assert.equal((await upload(pdf,'application/pdf',randomUUID(),randomUUID())).status,403);
    failReadback = true;
    assert.equal((await upload(pdf,'application/pdf')).status,502);
    assert.equal(objects.size,before); assert.equal(hits.at(-1),'DELETE');
    failReadback = false; loseCommitResponse = true;
    assert.equal((await upload(pdf,'application/pdf')).status,200);
    assert.equal(objects.size,before+1); assert.equal(hits.at(-1),'GET');
    console.log(`PASS wrong song, provider MIME cleanup, lost commit response recovery; signed_provider_requests=${hits.length}`);
  } catch (error) {
    process.stderr.write(output.replaceAll(serviceKey,'[redacted]').replaceAll(secretKey,'[redacted]'));
    throw error;
  } finally {
    edge.kill('SIGTERM');
    await Promise.race([new Promise<void>(r => edge.once('exit',() => r())),new Promise<void>(r => setTimeout(r,2000))]);
    if (edge.exitCode === null && edge.signalCode === null) edge.kill('SIGKILL');
    server.closeAllConnections();
    await new Promise<void>(r => server.close(() => r()));
  }
}
main().catch(error => { console.error(error); process.exitCode=1; });

import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { deflateSync } from 'node:zlib';

if (process.env.GENOVA_032_ACCEPTANCE !== '1') {
  throw new Error('GENOVA_032_ACCEPTANCE=1 is required.');
}

const PORT = 18032;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_PROTECTED_BYTES = 50 * 1024 * 1024;
const protectedPdf = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  'ascii',
);

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const label = Buffer.from(type, 'ascii');
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  label.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([label, data])), 8 + data.length);
  return result;
}

function makePng(width, height, seed) {
  let state = seed >>> 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const start = row * (width * 4 + 1);
    raw[start] = 0;
    for (let index = start + 1; index < start + width * 4 + 1; index += 4) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      raw[index] = state & 0xff;
      raw[index + 1] = (state >>> 8) & 0xff;
      raw[index + 2] = (state >>> 16) & 0xff;
      raw[index + 3] = 0xff;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 1 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const smallPng = makePng(64, 64, 0x032032);
const largePng = makePng(1600, 1600, 0x320320);
if (largePng.length <= 5 * 1024 * 1024) throw new Error('032 large PNG fixture is not over 5 MiB.');

const pickerHtml = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:-apple-system,sans-serif;background:#f7f8fb;color:#171a21;padding:16px}label,button{display:block;margin:12px 0;padding:14px;border:1px solid #315fd6;border-radius:10px;background:#fff}#status{min-height:44px;font-weight:700}input{font-size:16px}</style></head>
<body><h1>032 WebView görsel kabulü</h1>
<p id="policy">Politika hazırlanıyor…</p>
<label>Sentetik görsel seç<input id="accepted-image" aria-label="Sentetik görsel seç" type="file" accept="image/*" multiple capture="environment"></label>
<label>Desteklenmeyen PDF<input id="blocked-file" aria-label="Desteklenmeyen PDF seç" type="file" accept="application/pdf"></label>
<button id="cancel-check" aria-label="İptal sonrası devamı doğrula">İptal sonrası devamı doğrula</button>
<p id="status" role="status" aria-live="polite">Seçim bekleniyor.</p>
<script>
const statusNode=document.getElementById('status');
const accepted=document.getElementById('accepted-image');
const blocked=document.getElementById('blocked-file');
const hex=(bytes)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const report=(status)=>{statusNode.textContent=status;window.ReactNativeWebView?.postMessage(JSON.stringify({kind:'032-picker-status',status}));};
let policyAttempt=0;
const verifyPolicy=()=>{const ok=!accepted.multiple&&!accepted.hasAttribute('capture')&&accepted.accept==='image/jpeg,image/png,image/gif,image/webp'&&blocked.disabled;if(ok){document.getElementById('policy').textContent='Politika PASS · tek görsel · kamera yok · PDF kapalı';report('policy PASS');return;}policyAttempt+=1;if(policyAttempt<20){setTimeout(verifyPolicy,50);return;}document.getElementById('policy').textContent='Politika FAIL';report('policy FAIL');};
setTimeout(verifyPolicy,0);
accepted.addEventListener('change',async()=>{const file=accepted.files?.[0];if(!file)return;try{const bytes=await file.arrayBuffer();const digest=hex(await crypto.subtle.digest('SHA-256',bytes));const response=await fetch('/upload',{method:'POST',headers:{'content-type':'application/octet-stream','x-genova-sha256':digest,'x-genova-size':String(file.size)},body:bytes});const result=await response.json();report(result.ok?'image upload PASS '+file.size+'B '+digest.slice(0,12):'image upload FAIL');}catch{report('image upload FAIL');}});
document.addEventListener('genova:file-rejected',(event)=>report('image refusal PASS '+(event.target?.validationMessage||'policy')),true);
document.getElementById('cancel-check').addEventListener('click',()=>{accepted.focus();report(document.activeElement===accepted?'picker cancel recovery PASS':'picker cancel recovery FAIL');});
</script></body></html>`;

function sendBytes(response, status, bytes, contentType) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Length': bytes.length,
    'Content-Type': contentType,
  });
  response.end(bytes);
}

function streamOversize(response) {
  const total = MAX_PROTECTED_BYTES + 1;
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Length': total,
    'Content-Type': 'application/pdf',
  });
  const chunk = Buffer.alloc(64 * 1024, 0x20);
  let sent = 0;
  const write = () => {
    while (sent < total) {
      const remaining = total - sent;
      const piece = remaining < chunk.length ? chunk.subarray(0, remaining) : chunk;
      sent += piece.length;
      if (!response.write(piece)) {
        response.once('drain', write);
        return;
      }
    }
    response.end();
  };
  write();
}

function streamSlow(response) {
  const total = 8 * 1024 * 1024;
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Length': total,
    'Content-Type': 'application/pdf',
  });
  const chunk = Buffer.alloc(64 * 1024, 0x20);
  let sent = 0;
  const timer = setInterval(() => {
    if (response.destroyed || sent >= total) {
      clearInterval(timer);
      if (!response.destroyed) response.end();
      return;
    }
    response.write(chunk);
    sent += chunk.length;
  }, 20);
  response.on('close', () => clearInterval(timer));
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`);
  if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/picker')) {
    sendBytes(response, 200, Buffer.from(pickerHtml), 'text/html; charset=utf-8');
    return;
  }
  if (request.method === 'GET' && url.pathname === '/fixture-small.png') {
    sendBytes(response, 200, smallPng, 'image/png');
    return;
  }
  if (request.method === 'GET' && url.pathname === '/fixture-large.png') {
    sendBytes(response, 200, largePng, 'image/png');
    return;
  }
  if (request.method === 'POST' && url.pathname === '/upload') {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size <= MAX_UPLOAD_BYTES) chunks.push(chunk);
    });
    request.on('end', () => {
      if (size > MAX_UPLOAD_BYTES) {
        response.writeHead(413).end();
        console.log(`032_UPLOAD_REFUSED size=${size}`);
        return;
      }
      const bytes = Buffer.concat(chunks);
      const digest = createHash('sha256').update(bytes).digest('hex');
      const declaredDigest = request.headers['x-genova-sha256'];
      const declaredSize = Number(request.headers['x-genova-size']);
      const ok = digest === declaredDigest && size === declaredSize && size > 0;
      response.writeHead(ok ? 200 : 422, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ ok, size, sha256: digest }));
      console.log(`032_UPLOAD ${ok ? 'PASS' : 'FAIL'} size=${size} sha256=${digest}`);
    });
    return;
  }
  if (request.method === 'GET' && url.pathname === '/protected.pdf' && url.searchParams.get('ticket') === 'synthetic-032') {
    sendBytes(response, 200, protectedPdf, 'application/pdf');
    console.log(`032_PROTECTED PASS status=200 size=${protectedPdf.length} sha256=${createHash('sha256').update(protectedPdf).digest('hex')}`);
    return;
  }
  if (request.method === 'GET' && url.pathname === '/disguised.pdf') {
    sendBytes(response, 200, Buffer.from('<!doctype html><script>void 0</script>', 'ascii'), 'application/pdf');
    console.log('032_PROTECTED_REFUSAL malformed-content');
    return;
  }
  if (request.method === 'GET' && url.pathname === '/forbidden.pdf') {
    sendBytes(response, 403, Buffer.from('synthetic forbidden'), 'text/plain');
    console.log('032_PROTECTED_REFUSAL status=403');
    return;
  }
  if (request.method === 'GET' && url.pathname === '/expired.pdf') {
    sendBytes(response, 401, Buffer.from('synthetic expired'), 'text/plain');
    console.log('032_PROTECTED_REFUSAL status=401');
    return;
  }
  if (request.method === 'GET' && url.pathname === '/oversize.pdf') {
    console.log(`032_PROTECTED_REFUSAL oversize=${MAX_PROTECTED_BYTES + 1}`);
    streamOversize(response);
    return;
  }
  if (request.method === 'GET' && url.pathname === '/slow.pdf') {
    console.log('032_PROTECTED_CANCEL slow-start');
    streamSlow(response);
    return;
  }
  response.writeHead(404, { 'Cache-Control': 'no-store' }).end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`032_READY port=${PORT} small_png=${smallPng.length} large_png=${largePng.length} protected_pdf=${protectedPdf.length}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

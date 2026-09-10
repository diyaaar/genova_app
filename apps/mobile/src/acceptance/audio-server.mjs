import { createHash } from 'node:crypto';
import { createServer } from 'node:http';

if (process.env.GENOVA_026_ACCEPTANCE !== '1') {
  throw new Error('GENOVA_026_ACCEPTANCE=1 is required.');
}

function makeSyntheticWav() {
  const sampleRate = 8_000;
  const sampleCount = sampleRate * 10;
  const dataSize = sampleCount * 2;
  const bytes = Buffer.alloc(44 + dataSize);
  bytes.write('RIFF', 0, 'ascii');
  bytes.writeUInt32LE(36 + dataSize, 4);
  bytes.write('WAVE', 8, 'ascii');
  bytes.write('fmt ', 12, 'ascii');
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36, 'ascii');
  bytes.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 8_000);
    bytes.writeInt16LE(sample, 44 + index * 2);
  }
  return bytes;
}

const tone = makeSyntheticWav();
const corrupt = Buffer.from('not a valid audio container');

function serveBytes(request, response, bytes, contentType) {
  response.setHeader('Accept-Ranges', 'bytes');
  response.setHeader('Content-Type', contentType);
  response.setHeader('Cache-Control', 'no-store');
  const range = request.headers.range;
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/u.exec(range);
    if (!match) {
      response.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` }).end();
      return { status: 416, count: 0 };
    }
    const start = Number(match[1]);
    const end = match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
    if (start >= bytes.length || end < start) {
      response.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` }).end();
      return { status: 416, count: 0 };
    }
    const body = bytes.subarray(start, end + 1);
    response.writeHead(206, {
      'Content-Length': body.length,
      'Content-Range': `bytes ${start}-${end}/${bytes.length}`,
    });
    if (request.method !== 'HEAD') response.end(body);
    else response.end();
    return { status: 206, count: body.length };
  }
  response.writeHead(200, { 'Content-Length': bytes.length });
  if (request.method !== 'HEAD') response.end(bytes);
  else response.end();
  return { status: 200, count: bytes.length };
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1:18026');
  if (!url.searchParams.get('ticket') || !url.searchParams.get('fileId')) {
    response.writeHead(403).end('missing synthetic ticket');
    return;
  }
  const target = url.pathname.endsWith('/tone.wav')
    ? { bytes: tone, contentType: 'audio/wav' }
    : url.pathname.endsWith('/corrupt.wav')
      ? { bytes: corrupt, contentType: 'audio/wav' }
      : null;
  if (!target) {
    response.writeHead(404).end('not found');
    return;
  }
  const result = serveBytes(request, response, target.bytes, target.contentType);
  const declaredClient = url.pathname.split('/')[1];
  const userAgent = request.headers['user-agent'] ?? '';
  const client = declaredClient === 'android' || declaredClient === 'ios'
    ? declaredClient
    : /android|exoplayer|media3/iu.test(userAgent)
      ? 'android'
      : /applecoremedia|cfnetwork/iu.test(userAgent)
        ? 'ios'
        : 'unknown';
  console.log(`026_AUDIO_REQUEST client=${client} method=${request.method} status=${result.status} path=${url.pathname} range=${request.headers.range ?? 'none'} bytes=${result.count}`);
});

server.listen(18026, '127.0.0.1', () => {
  console.log(`026_AUDIO_READY bytes=${tone.length} sha256=${createHash('sha256').update(tone).digest('hex')}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

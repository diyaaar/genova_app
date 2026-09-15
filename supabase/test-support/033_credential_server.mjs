import { createServer } from 'node:http';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXACT_HOST = '127.0.0.1';
const EXACT_PORT = 18034;
const EXACT_PATH = '/credentials';
const MAX_REQUEST_BYTES = 512;
const MAX_FIXTURE_BYTES = 64 * 1024;
const SYNTHETIC_EMAIL = /^(033-composed-|033-chorist-).+@example\.invalid$/u;

function refuse(message = 'credential request refused') {
  const error = new Error(message);
  error.code = 'GENOVA_033_REFUSED';
  return error;
}

function noStoreHeaders(contentLength = 0) {
  return {
    'Cache-Control': 'no-store, max-age=0',
    Connection: 'close',
    Pragma: 'no-cache',
    'Content-Length': String(contentLength),
    'X-Content-Type-Options': 'nosniff',
  };
}

function emptyResponse(response, status) {
  response.writeHead(status, noStoreHeaders());
  response.end();
}

async function readBoundedBody(request) {
  let size = 0;
  let oversized = false;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) {
      oversized = true;
      chunks.length = 0;
    } else if (!oversized) chunks.push(chunk);
  }
  if (oversized) throw refuse();
  return Buffer.concat(chunks).toString('utf8');
}

function requestLooksNativeAndLocal(request, expectedHost) {
  const remote = request.socket.remoteAddress;
  const headers = request.headers;
  return request.method === 'POST'
    && request.url === EXACT_PATH
    && headers.host === expectedHost
    && headers['content-type'] === 'application/json'
    && (remote === '127.0.0.1' || remote === '::ffff:127.0.0.1')
    && !headers.origin
    && !headers.cookie
    && !headers.authorization
    && !Object.keys(headers).some((name) => name.startsWith('sec-fetch-'));
}

function validateCredential(credential) {
  if (!credential || typeof credential !== 'object'
    || !SYNTHETIC_EMAIL.test(credential.email ?? '')
    || typeof credential.password !== 'string'
    || credential.password.length < 8 || credential.password.length > 256) {
    throw refuse();
  }
}

/** Starts one in-memory delivery. Only a successful exact identity request consumes it. */
export async function startSingleUseCredentialServer({
  credential,
  port = EXACT_PORT,
  timeoutMs = 120_000,
} = {}) {
  validateCredential(credential);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw refuse();
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 120_000) throw refuse();

  let mutableCredential = { email: credential.email, password: credential.password };
  let consumed = false;
  let settle;
  let rejectCompletion;
  const completion = new Promise((resolveCompletion, reject) => {
    settle = resolveCompletion;
    rejectCompletion = reject;
  });

  const server = createServer(async (request, response) => {
    const address = server.address();
    const expectedHost = `${EXACT_HOST}:${typeof address === 'object' && address ? address.port : port}`;
    if (consumed || !requestLooksNativeAndLocal(request, expectedHost)) {
      request.resume();
      emptyResponse(response, 403);
      return;
    }
    try {
      const body = await readBoundedBody(request);
      const parsed = JSON.parse(body);
      if (!parsed || typeof parsed !== 'object'
        || Object.keys(parsed).join(',') !== 'email'
        || parsed.email !== mutableCredential.email) {
        emptyResponse(response, 403);
        return;
      }
      consumed = true;
      const responseBody = JSON.stringify(mutableCredential);
      response.writeHead(200, {
        ...noStoreHeaders(Buffer.byteLength(responseBody)),
        'Content-Type': 'application/json',
      });
      response.end(responseBody, () => {
        mutableCredential.password = '';
        mutableCredential = { email: '', password: '' };
        clearTimeout(timeout);
        server.close(() => settle('delivered'));
      });
    } catch {
      emptyResponse(response, 403);
    }
  });

  await new Promise((resolveListening, rejectListening) => {
    server.once('error', rejectListening);
    server.listen({ host: EXACT_HOST, port, exclusive: true }, () => {
      server.off('error', rejectListening);
      resolveListening();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') throw refuse();
  const timeout = setTimeout(() => {
    mutableCredential.password = '';
    mutableCredential = { email: '', password: '' };
    server.close(() => rejectCompletion(refuse('credential delivery timed out')));
  }, timeoutMs);

  return {
    url: `http://${EXACT_HOST}:${address.port}${EXACT_PATH}`,
    completion,
    close: () => new Promise((resolveClose) => {
      clearTimeout(timeout);
      mutableCredential.password = '';
      mutableCredential = { email: '', password: '' };
      server.close(() => resolveClose());
    }),
  };
}

async function loadOwnedCredential() {
  if (process.env.GENOVA_033_CREDENTIAL_SERVER !== '1') throw refuse();
  const role = process.env.GENOVA_033_CREDENTIAL_ROLE;
  if (role !== 'admin' && role !== 'chorist') throw refuse();

  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = resolve(moduleDirectory, '../..');
  const expectedRuntime = resolve(repositoryRoot, 'spike/033-runtime');
  const runtimeInput = process.env.GENOVA_033_WORKDIR ?? '';
  if (resolve(runtimeInput) !== expectedRuntime || await realpath(runtimeInput) !== expectedRuntime) throw refuse();

  const expectedFixture = resolve(expectedRuntime, '.033-fixture.json');
  const fixtureInput = process.env.GENOVA_033_FIXTURE_PATH ?? '';
  const metadata = await lstat(fixtureInput);
  if (resolve(fixtureInput) !== expectedFixture || await realpath(fixtureInput) !== expectedFixture
    || !metadata.isFile() || metadata.isSymbolicLink() || (metadata.mode & 0o777) !== 0o600
    || metadata.size <= 0 || metadata.size > MAX_FIXTURE_BYTES) throw refuse();

  const fixture = JSON.parse(await readFile(expectedFixture, 'utf8'));
  if (fixture.version !== 1) throw refuse();
  const credential = role === 'admin'
    ? { email: fixture.adminEmail, password: fixture.adminPassword }
    : { email: fixture.choristEmail, password: fixture.choristPassword };
  validateCredential(credential);
  return { credential, role };
}

async function main() {
  const { credential, role } = await loadOwnedCredential();
  const delivery = await startSingleUseCredentialServer({ credential });
  console.log(`READY credential_delivery role=${role} endpoint=http://${EXACT_HOST}:${EXACT_PORT}${EXACT_PATH} ttl=120s`);
  await delivery.completion;
  console.log(`PASS credential_delivery role=${role} single_use=true`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch(() => {
    console.error('FAIL credential_delivery reason=refused-or-expired');
    process.exitCode = 1;
  });
}

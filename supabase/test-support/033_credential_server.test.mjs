import assert from 'node:assert/strict';
import { request } from 'node:http';
import test from 'node:test';
import { startSingleUseCredentialServer } from './033_credential_server.mjs';

const credential = {
  email: '033-composed-server@example.invalid',
  password: 'synthetic-password-033',
};

function send(urlValue, { method = 'POST', headers = {}, body = JSON.stringify({ email: credential.email }) } = {}) {
  const url = new URL(urlValue);
  return new Promise((resolve, reject) => {
    const outgoing = request(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    outgoing.on('error', reject);
    outgoing.end(body);
  });
}

test('delivers the selected credential exactly once with non-cacheable headers', async () => {
  const server = await startSingleUseCredentialServer({ credential, port: 0, timeoutMs: 2_000 });
  const attempts = await Promise.all([send(server.url), send(server.url)]);
  const delivered = attempts.find((attempt) => attempt.status === 200);
  assert.ok(delivered);
  assert.deepEqual(attempts.map((attempt) => attempt.status).sort(), [200, 403]);
  assert.deepEqual(JSON.parse(delivered.body), credential);
  assert.match(delivered.headers['cache-control'], /no-store/u);
  await server.completion;
  await assert.rejects(send(server.url));
});

test('wrong identity does not consume the one permitted delivery', async () => {
  const server = await startSingleUseCredentialServer({ credential, port: 0, timeoutMs: 2_000 });
  const refused = await send(server.url, { body: JSON.stringify({ email: '033-chorist-other@example.invalid' }) });
  assert.equal(refused.status, 403);
  assert.equal(refused.body, '');
  assert.equal((await send(server.url)).status, 200);
  await server.completion;
});

test('browser, wrong-host and wrong-method requests stay refused without consuming delivery', async () => {
  const server = await startSingleUseCredentialServer({ credential, port: 0, timeoutMs: 2_000 });
  assert.equal((await send(server.url, { headers: { Origin: 'http://127.0.0.1:18033' } })).status, 403);
  assert.equal((await send(server.url, { headers: { Host: 'localhost:18034' } })).status, 403);
  assert.equal((await send(server.url, { method: 'GET', body: '' })).status, 403);
  assert.equal((await send(server.url)).status, 200);
  await server.completion;
});

test('invalid credentials and unsafe lifecycle options fail before binding', async () => {
  await assert.rejects(startSingleUseCredentialServer({ credential: { ...credential, email: 'real@example.com' }, port: 0 }));
  await assert.rejects(startSingleUseCredentialServer({ credential, port: 0, timeoutMs: 120_001 }));
});

import { describe, expect, it, vi } from 'vitest';
import {
  fetchR2Object,
  isSafeR2ObjectKey,
  makeR2ObjectUrl,
  parseR2Jurisdiction,
} from './r2';

const accountId = '0123456789abcdef0123456789abcdef';
const objectKey = 'choirs/22222222-2222-4222-8222-222222222222/repertoire/11111111-1111-4111-8111-111111111111/score.pdf';

describe('private R2 target', () => {
  it('builds only the exact account, jurisdiction, bucket and encoded key endpoint', () => {
    expect(makeR2ObjectUrl({
      accountId,
      jurisdiction: 'eu',
      bucket: 'genova-private',
      objectKey,
    })?.toString()).toBe(
      `https://${accountId}.eu.r2.cloudflarestorage.com/genova-private/${objectKey}`,
    );
    expect(parseR2Jurisdiction(undefined)).toBe('');
    expect(parseR2Jurisdiction('fedramp')).toBe('fedramp');
    expect(parseR2Jurisdiction('weur')).toBeNull();
  });

  it.each([
    '../score.pdf',
    'choirs/x//score.pdf',
    'choirs/x/./score.pdf',
    'choirs/x/repertoire/file/score.pdf?leak=true',
    'choirs/x/repertoire/file/score.pdf#fragment',
    '/absolute.pdf',
  ])('rejects unsafe object key %s', (unsafeKey) => {
    expect(isSafeR2ObjectKey(unsafeKey)).toBe(false);
    expect(makeR2ObjectUrl({
      accountId,
      jurisdiction: '',
      bucket: 'genova-private',
      objectKey: unsafeKey,
    })).toBeNull();
  });

  it('allows a loopback endpoint only behind the explicit test guard', () => {
    expect(makeR2ObjectUrl({
      accountId,
      jurisdiction: '',
      bucket: 'genova-private',
      objectKey,
      testEndpoint: 'http://127.0.0.1:8788/',
    })).toBeNull();
    expect(makeR2ObjectUrl({
      accountId,
      jurisdiction: '',
      bucket: 'genova-private',
      objectKey,
      testEndpoint: 'http://provider.example.test/',
      allowInsecureLoopback: true,
    })).toBeNull();
    expect(makeR2ObjectUrl({
      accountId,
      jurisdiction: '',
      bucket: 'genova-private',
      objectKey,
      testEndpoint: 'http://127.0.0.1:8788/',
      allowInsecureLoopback: true,
    })?.origin).toBe('http://127.0.0.1:8788');
  });

  it('passes only method and range to the maintained signed fetcher and refuses redirects', async () => {
    const signedFetch = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { Location: 'https://attacker.invalid/' },
    }));
    const response = await fetchR2Object({
      accountId,
      jurisdiction: '',
      bucket: 'genova-private',
      objectKey,
      method: 'GET',
      range: 'bytes=4-9',
      signedFetch,
    });
    expect(response.status).toBe(302);
    expect(signedFetch).toHaveBeenCalledTimes(1);
    const [url, init] = signedFetch.mock.calls[0];
    expect(String(url)).toBe(`https://${accountId}.r2.cloudflarestorage.com/genova-private/${objectKey}`);
    expect(init).toMatchObject({ method: 'GET', redirect: 'manual', cache: 'no-store' });
    expect(new Headers(init?.headers).get('range')).toBe('bytes=4-9');
    expect(new Headers(init?.headers).has('authorization')).toBe(false);
  });
});

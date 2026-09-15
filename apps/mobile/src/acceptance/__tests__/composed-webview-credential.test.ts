import {
  GENERIC_CREDENTIAL_ERROR,
  signInWithComposedCredential,
} from '../composed-webview-credential';

const URL = 'http://127.0.0.1:18034/credentials';
const EMAIL = '033-composed-test@example.invalid';
const PASSWORD = 'synthetic-password-033';

function response(body: unknown, overrides: Partial<Response> = {}): Response {
  const value = JSON.stringify(body);
  return {
    status: 200,
    url: URL,
    headers: new Headers({ 'content-type': 'application/json', 'content-length': String(value.length) }),
    text: async () => value,
    ...overrides,
  } as Response;
}

describe('033 single-use credential client', () => {
  it('posts only the synthetic identity and passes the short-lived password directly to Auth', async () => {
    const fetchImpl = jest.fn(async () => response({ email: EMAIL, password: PASSWORD }));
    const signIn = jest.fn(async () => ({ error: null }));

    await expect(signInWithComposedCredential({ credentialUrl: URL, email: EMAIL, fetchImpl, signIn }))
      .resolves.toEqual({ error: null });

    expect(fetchImpl).toHaveBeenCalledWith(URL, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: EMAIL }),
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
    }));
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith(EMAIL, PASSWORD);
  });

  it.each([
    ['hosted URL', 'https://example.com/credentials', response({ email: EMAIL, password: PASSWORD })],
    ['wrong identity', URL, response({ email: '033-chorist-other@example.invalid', password: PASSWORD })],
    ['extra field', URL, response({ email: EMAIL, password: PASSWORD, token: 'nope' })],
    ['redirected response', URL, response({ email: EMAIL, password: PASSWORD }, { url: 'http://127.0.0.1:18034/other' })],
    ['wrong content type', URL, response({ email: EMAIL, password: PASSWORD }, { headers: new Headers({ 'content-type': 'text/plain' }) })],
    ['oversized response', URL, response({ email: EMAIL, password: PASSWORD }, { headers: new Headers({ 'content-type': 'application/json', 'content-length': '2048' }) })],
  ])('fails closed for %s without calling Auth', async (_label, credentialUrl, fetchResponse) => {
    const signIn = jest.fn(async () => ({ error: null }));
    const fetchImpl = jest.fn(async () => fetchResponse);
    await expect(signInWithComposedCredential({ credentialUrl, email: EMAIL, fetchImpl, signIn }))
      .resolves.toEqual({ error: GENERIC_CREDENTIAL_ERROR });
    expect(signIn).not.toHaveBeenCalled();
  });

  it('maps provider and network details to one non-sensitive error', async () => {
    const provider = await signInWithComposedCredential({
      credentialUrl: URL,
      email: EMAIL,
      fetchImpl: async () => response({ email: EMAIL, password: PASSWORD }),
      signIn: async () => ({ error: 'provider credential detail' }),
    });
    const network = await signInWithComposedCredential({
      credentialUrl: URL,
      email: EMAIL,
      fetchImpl: async () => { throw new Error(`network leaked ${PASSWORD}`); },
      signIn: async () => ({ error: null }),
    });
    expect(provider).toEqual({ error: GENERIC_CREDENTIAL_ERROR });
    expect(network).toEqual({ error: GENERIC_CREDENTIAL_ERROR });
    expect(JSON.stringify([provider, network])).not.toContain(PASSWORD);
  });

  it('does not call Auth when the request is aborted before delivery', async () => {
    const controller = new AbortController();
    controller.abort();
    const signIn = jest.fn(async () => ({ error: null }));
    const result = await signInWithComposedCredential({
      credentialUrl: URL,
      email: EMAIL,
      signal: controller.signal,
      fetchImpl: async (_input, init) => {
        if (init?.signal?.aborted) throw new Error('aborted');
        return response({ email: EMAIL, password: PASSWORD });
      },
      signIn,
    });
    expect(result).toEqual({ error: GENERIC_CREDENTIAL_ERROR });
    expect(signIn).not.toHaveBeenCalled();
  });
});

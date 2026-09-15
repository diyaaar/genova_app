import { exactComposedCredentialUrl } from './composed-webview-runtime-config';

const GENERIC_CREDENTIAL_ERROR = 'Yerel kabul oturumu başlatılamadı. Bilgi kanalını yeniden hazırlayın.';
const MAX_RESPONSE_BYTES = 1_024;

type SignIn = (email: string, password: string) => Promise<{ error: string | null }>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type CredentialPayload = { email?: unknown; password?: unknown };

export interface ComposedCredentialSignInOptions {
  credentialUrl: string;
  email: string;
  signIn: SignIn;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

/**
 * Obtains one synthetic password from the exact loopback channel and hands it directly to Auth.
 * The credential is never returned to the caller or retained in component state.
 */
export async function signInWithComposedCredential({
  credentialUrl,
  email,
  signIn,
  signal,
  fetchImpl = fetch,
  timeoutMs = 10_000,
}: ComposedCredentialSignInOptions): Promise<{ error: string | null }> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  let credential: CredentialPayload | null = null;
  let password = '';

  try {
    exactComposedCredentialUrl(credentialUrl);
    if (!/^(033-composed-|033-chorist-).+@example\.invalid$/u.test(email)) throw new Error('invalid identity');
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30_000) throw new Error('invalid timeout');

    if (signal?.aborted) controller.abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, timeoutMs);

    try {
      const response = await fetchImpl(credentialUrl, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        signal: controller.signal,
      });
      if (controller.signal.aborted || response.status !== 200
        || (response.url && response.url !== credentialUrl)
        || !/^application\/json(?:;|$)/iu.test(response.headers.get('content-type') ?? '')) {
        throw new Error('invalid response');
      }
      const lengthHeader = response.headers.get('content-length');
      if (lengthHeader && (!/^\d+$/u.test(lengthHeader) || Number(lengthHeader) > MAX_RESPONSE_BYTES)) {
        throw new Error('oversized response');
      }
      const body = await response.text();
      if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) throw new Error('oversized response');
      credential = JSON.parse(body) as CredentialPayload;
      if (!credential || typeof credential !== 'object'
        || Object.keys(credential).sort().join(',') !== 'email,password'
        || credential.email !== email || typeof credential.password !== 'string'
        || credential.password.length < 8 || credential.password.length > 256
        || controller.signal.aborted) {
        throw new Error('invalid credential');
      }
      password = credential.password;
      const result = await signIn(email, password);
      if (controller.signal.aborted || result.error) return { error: GENERIC_CREDENTIAL_ERROR };
      return { error: null };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { error: GENERIC_CREDENTIAL_ERROR };
  } finally {
    signal?.removeEventListener('abort', abort);
    password = '';
    if (credential) credential.password = '';
    credential = null;
  }
}

export { GENERIC_CREDENTIAL_ERROR };

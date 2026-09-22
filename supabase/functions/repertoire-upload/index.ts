import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { AwsClient } from 'npm:aws4fetch@1.0.20';
import { resolveSupabasePublicKey } from '../create-choir/create-choir-core.ts';
import { makeR2ObjectUrl, parseR2Jurisdiction } from '../repertoire-file/r2.ts';
import { createRepertoireUploadHandler } from './handler.ts';
import { UploadError } from './stream.ts';
import { sendSignedUpload } from './transport.ts';

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
const mode = Deno.env.get('REPERTOIRE_STORAGE_MODE') ?? 'legacy';
const bucket = Deno.env.get('R2_BUCKET') ?? '';

Deno.serve(createRepertoireUploadHandler({
  enabled: Deno.env.get('REPERTOIRE_R2_UPLOAD_ENABLED') === 'true' && (mode === 'mixed' || mode === 'r2-required'),
  bucket,
  async authorize(token) {
    const key = resolveSupabasePublicKey(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'), Deno.env.get('SUPABASE_ANON_KEY'));
    if (!key) throw new Error('Missing public key');
    const client = createClient(env('SUPABASE_URL'), key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) throw new UploadError('unauthorized', 401);
    const { data: choirId, error: choirError } = await client.rpc('current_choir_id');
    if (choirError || typeof choirId !== 'string') throw new UploadError('forbidden', 403);
    // Decoding is used only after Auth has verified this exact token, never as authentication.
    let sessionId: string | null = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof payload.session_id === 'string') sessionId = payload.session_id;
    } catch { throw new UploadError('unauthorized', 401); }
    return { userId: data.user.id, sessionId, choirId };
  },
  async transact({ action, actor, retryKey, metadata, lease, sha256 }) {
    const client = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }) },
    });
    const { data, error } = await client.rpc('repertoire_upload_054', {
      p_action: action, p_actor_id: actor.userId, p_session_id: actor.sessionId,
      p_choir_id: actor.choirId, p_retry_key: retryKey, p_metadata: metadata,
      p_bucket: bucket, p_lease: lease ?? null,
      p_sha256: sha256 ?? null,
    });
    if (error) throw new UploadError(
      error.code === '42501' ? 'forbidden' : error.code === '23505' ? 'upload-conflict' : 'upload-transaction-failed',
      error.code === '42501' ? 403 : error.code === '23505' ? 409 : 502,
    );
    if (!data || typeof data !== 'object') throw new Error('Invalid transaction response');
    return data;
  },
  async object({ reservation, method, metadata, body, signal }) {
    const jurisdiction = parseR2Jurisdiction(Deno.env.get('R2_JURISDICTION'));
    if (jurisdiction === null || reservation.bucket !== bucket) throw new Error('Invalid R2 target');
    const url = makeR2ObjectUrl({
      accountId: env('R2_ACCOUNT_ID'), jurisdiction, bucket, objectKey: reservation.objectKey!,
      testEndpoint: Deno.env.get('R2_TEST_ENDPOINT'),
      allowInsecureLoopback: Deno.env.get('R2_ALLOW_INSECURE_LOOPBACK') === 'true',
    });
    if (!url) throw new Error('Invalid R2 target');
    const client = new AwsClient({
      service: 's3', region: 'auto', retries: 0,
      accessKeyId: env('R2_ACCESS_KEY_ID'), secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    });
    const headers = new Headers({ 'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD' });
    if (method === 'PUT') {
      headers.set('Content-Type', metadata.mimeType);
      headers.set('Content-Length', String(metadata.size));
    }
    // Sign once; automatic transport retry cannot replay a consumed streaming request.
    const signed = await client.sign(url, { method, headers, body, redirect: 'manual', signal });
    return method === 'PUT' ? sendSignedUpload(signed) : fetch(signed);
  },
}));

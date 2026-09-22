import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { AwsClient } from 'npm:aws4fetch@1.0.20';
import { makeR2ObjectUrl, parseR2Jurisdiction } from '../repertoire-file/r2.ts';
import { authorizeRepertoireManager, requiredEnv } from '../repertoire-upload/auth.ts';
import { UploadError } from '../repertoire-upload/stream.ts';
import { createRepertoireLifecycleHandler, type LifecycleResult } from './handler.ts';

const mode = Deno.env.get('REPERTOIRE_STORAGE_MODE') ?? 'legacy';
const bucket = Deno.env.get('R2_BUCKET') ?? '';

Deno.serve(createRepertoireLifecycleHandler({
  enabled: Deno.env.get('REPERTOIRE_R2_UPLOAD_ENABLED') === 'true' && (mode === 'mixed' || mode === 'r2-required'),
  bucket,
  authorize: authorizeRepertoireManager,
  async transact({ action, actor, retryKey, targetType, targetId, mode: lifecycleMode }) {
    const client = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }) },
    });
    const { data, error } = await client.rpc('repertoire_lifecycle_055', {
      p_action: action, p_actor_id: actor.userId, p_session_id: actor.sessionId,
      p_choir_id: actor.choirId, p_retry_key: retryKey, p_target_type: targetType,
      p_target_id: targetId, p_mode: lifecycleMode,
    });
    if (error) {
      const mapped = error.code === 'P5501' ? ['annotated-pdf',409] as const
        : error.code === 'P5502' ? ['unsupported-lifecycle',409] as const
        : error.code === 'P5503' ? ['cleanup-batch-too-large',413] as const
        : error.code === '42501' ? ['forbidden',403] as const
        : error.code === '23505' ? ['lifecycle-conflict',409] as const
        : ['lifecycle-transaction-failed',502] as const;
      throw new UploadError(mapped[0],mapped[1]);
    }
    if (!data || typeof data !== 'object') throw new UploadError('invalid-lifecycle-result',502);
    return data as LifecycleResult;
  },
  async remove(target, signal) {
    const jurisdiction = parseR2Jurisdiction(Deno.env.get('R2_JURISDICTION'));
    if (jurisdiction === null || target.bucket !== bucket) throw new Error('Invalid R2 target');
    const url = makeR2ObjectUrl({ accountId: requiredEnv('R2_ACCOUNT_ID'), jurisdiction,
      bucket, objectKey: target.objectKey, testEndpoint: Deno.env.get('R2_TEST_ENDPOINT'),
      allowInsecureLoopback: Deno.env.get('R2_ALLOW_INSECURE_LOOPBACK') === 'true' });
    if (!url) throw new Error('Invalid R2 target');
    const client = new AwsClient({ service:'s3',region:'auto',retries:0,
      accessKeyId:requiredEnv('R2_ACCESS_KEY_ID'),secretAccessKey:requiredEnv('R2_SECRET_ACCESS_KEY') });
    return fetch(await client.sign(url,{ method:'DELETE',redirect:'manual',signal }));
  },
}));

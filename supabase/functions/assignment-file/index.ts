import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { AwsClient } from 'npm:aws4fetch@1.0.20';
import { resolveSupabasePublicKey } from '../create-choir/create-choir-core.ts';
import { createRepertoireFileHandler } from '../repertoire-file/handler.ts';
import { fetchR2Object, parseR2Jurisdiction } from '../repertoire-file/r2.ts';
import { createAssignmentFileTicket, verifyAssignmentFileTicket } from './ticket.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERSION_FIELDS = 'id,choir_id,submission_id,assignment_id,member_id,provider,bucket,object_key,content_length,mime_type,sha256_hex,file_name,created_at';

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
function userClient(authorization: string) {
  const key = resolveSupabasePublicKey(
    Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'), Deno.env.get('SUPABASE_ANON_KEY'),
  );
  if (!key) throw new Error('Missing public key');
  return createClient(requiredEnv('SUPABASE_URL'), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
}
function adminClient() {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
type Version = {
  id: string; choir_id: string; assignment_id: string; provider: string; bucket: string; object_key: string;
  content_length: number; mime_type: string; sha256_hex: string; file_name: string;
  created_at: string;
};
function asFile(version: Version) {
  return {
    id: version.id, choir_id: version.choir_id, drive_file_id: `r2_${version.id}`,
    drive_download_link: null, file_name: version.file_name, mime_type: version.mime_type,
  };
}
function asLocation(version: Version) {
  return {
    repertoire_file_id: version.id, choir_id: version.choir_id, provider: version.provider,
    bucket: version.bucket, object_key: version.object_key, content_length: version.content_length,
    mime_type: version.mime_type, sha256_hex: version.sha256_hex,
    verified_at: version.created_at ?? new Date(0).toISOString(), is_active: true,
  };
}

const handler = createRepertoireFileHandler({
  async authorize({ authorization, accessToken, fileId }) {
    const client = userClient(authorization);
    const { data: userData, error: userError } = await client.auth.getUser(accessToken);
    if (userError || !userData.user) throw new Error('Unauthorized');
    const { data: choirId, error: choirError } = await client.rpc('current_choir_id');
    if (choirError || typeof choirId !== 'string' || !UUID.test(choirId)) return null;
    const { data, error } = await client.from('assignment_submission_file_versions')
      .select(VERSION_FIELDS).eq('id', fileId).maybeSingle();
    if (error) throw new Error('File authorization lookup failed');
    if (!data || data.choir_id !== choirId) return null;
    return { choirId, file: asFile(data as Version) };
  },
  async loadTicketFile({ fileId, choirId }) {
    const { data, error } = await adminClient().from('assignment_submission_file_versions')
      .select(VERSION_FIELDS).eq('id', fileId).eq('choir_id', choirId).maybeSingle();
    if (error) throw new Error('Ticket file lookup failed');
    return data ? asFile(data as Version) : null;
  },
  async loadR2Location({ fileId, choirId }) {
    const { data, error } = await adminClient().from('assignment_submission_file_versions')
      .select(VERSION_FIELDS).eq('id', fileId).eq('choir_id', choirId).maybeSingle();
    if (error) throw new Error('R2 location lookup failed');
    return data ? asLocation(data as Version) : null;
  },
  createTicket(input) {
    return createAssignmentFileTicket(input, requiredEnv('SUPABASE_SERVICE_ROLE_KEY'));
  },
  verifyTicket(token) {
    return verifyAssignmentFileTicket(token, requiredEnv('SUPABASE_SERVICE_ROLE_KEY'));
  },
  fetchDrive() { throw new Error('Drive is unavailable for assignment versions'); },
  fetchStorage() { throw new Error('Storage is unavailable for assignment versions'); },
  async fetchR2({ location, method, range }) {
    const accountId = requiredEnv('R2_ACCOUNT_ID');
    const bucket = requiredEnv('R2_BUCKET');
    const jurisdiction = parseR2Jurisdiction(Deno.env.get('R2_JURISDICTION'));
    if (jurisdiction === null || location.bucket !== bucket) throw new Error('Invalid R2 target');
    const { data: version } = await adminClient().from('assignment_submission_file_versions')
      .select('assignment_id').eq('id', location.repertoire_file_id).eq('choir_id', location.choir_id).maybeSingle();
    const expected = version?.assignment_id
      ? `choirs/${location.choir_id}/assignments/${version.assignment_id}/submissions/${location.repertoire_file_id}/content`
      : null;
    if (!expected || location.object_key !== expected) {
      throw new Error('R2 object key mismatch');
    }
    const client = new AwsClient({
      service: 's3', region: 'auto', accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY'),
    });
    return fetchR2Object({
      accountId,jurisdiction,bucket,objectKey:location.object_key,method,range:range ?? undefined,
      signedFetch:(input,init)=>client.fetch(input,init),testEndpoint:Deno.env.get('R2_TEST_ENDPOINT'),
      allowInsecureLoopback:Deno.env.get('R2_ALLOW_INSECURE_LOOPBACK')==='true',
    });
  },
  storageMode: 'r2-required',
});

Deno.serve(handler);

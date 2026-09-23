import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  EmbeddedLeaseVault,
  activateEmbeddedRuntime,
  verifyEmbeddedContext,
  type EmbeddedAccessKind,
  type EmbeddedContextCandidate,
  type EmbeddedContextProofDependencies,
  type EmbeddedLeaseSnapshot,
} from '@/lib/embedded-web-runtime';
import { loadMyChoirs } from '@/lib/choir-context-core';
import { authorizeRealtimeBeforeJoin } from '@/lib/realtime';

export {
  normalizeRepertoireSong,
  normalizeRepertoireSongs,
  type FileType,
  type RepertoireFile,
  type RepertoireSong,
  type RepertoireSongRow,
  type RepertoireTag,
} from '@/lib/repertuvar/catalog-core';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browserClient: SupabaseClient | null = null;

function getBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    });
  }
  return browserClient;
}

/** Lazy proxy so an embedded renderer can lock before GoTrue reads browser persistence. */
export const browserSupabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getBrowserClient();
    const value = Reflect.get(client, property, client) as unknown;
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

const embeddedLeaseVault = new EmbeddedLeaseVault();
let embeddedSupabase: SupabaseClient | null = null;
let embeddedUnauthorizedHandler: (() => void) | null = null;
let embeddedAuthGeneration = 0;
let embeddedRealtimeQueue: Promise<void> = Promise.resolve();

function enqueueEmbeddedRealtime<T>(operation: () => Promise<T>): Promise<T> {
  const queued = embeddedRealtimeQueue.then(operation, operation);
  embeddedRealtimeQueue = queued.then(() => undefined, () => undefined);
  return queued;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

async function embeddedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const method = requestMethod(input, init);
  const kind: EmbeddedAccessKind = method === 'GET' || method === 'HEAD' ? 'read' : 'mutation';
  const access = embeddedLeaseVault.requireAccess(kind);
  const headers = new Headers(init?.headers ?? (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined));
  headers.set('Authorization', `Bearer ${access.accessToken}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) notifyEmbeddedUnauthorized();
  return response;
}

function createEmbeddedDataClient(accessToken: () => Promise<string | null>, guardedFetch: typeof fetch): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { fetch: guardedFetch },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });
}

/** Live data binding: browser by default, non-persisting bearer client after exact bridge detection. */
export let supabase: SupabaseClient = browserSupabase;

export function enterEmbeddedSupabaseMode(): EmbeddedLeaseSnapshot {
  activateEmbeddedRuntime();
  embeddedLeaseVault.enterEmbeddedMode();
  if (!embeddedSupabase) {
    embeddedSupabase = createEmbeddedDataClient(
      async () => {
        try {
          return embeddedLeaseVault.requireAccess('read').accessToken;
        } catch {
          return null;
        }
      },
      embeddedFetch,
    );
  }
  supabase = embeddedSupabase;
  return embeddedLeaseVault.snapshot();
}

export function getEmbeddedLeaseSnapshot(): EmbeddedLeaseSnapshot {
  return embeddedLeaseVault.snapshot();
}

export function subscribeEmbeddedLease(listener: (snapshot: EmbeddedLeaseSnapshot) => void): () => void {
  return embeddedLeaseVault.subscribe(listener);
}

export function setEmbeddedUnauthorizedHandler(handler: (() => void) | null): () => void {
  embeddedUnauthorizedHandler = handler;
  return () => {
    if (embeddedUnauthorizedHandler === handler) embeddedUnauthorizedHandler = null;
  };
}

export function notifyEmbeddedUnauthorized(): void {
  if (embeddedLeaseVault.snapshot().mode === 'embedded') embeddedUnauthorizedHandler?.();
}

export function requireEmbeddedAccess(kind: EmbeddedAccessKind = 'read') {
  return embeddedLeaseVault.requireAccess(kind);
}

export async function authorizeCurrentRealtime(): Promise<void> {
  if (embeddedLeaseVault.snapshot().mode === 'embedded') {
    return enqueueEmbeddedRealtime(async () => {
      if (!embeddedSupabase) throw new Error('chat-realtime-client-unavailable');
      await authorizeRealtimeBeforeJoin({
        getAccessToken: async () => embeddedLeaseVault.requireAccess('read').accessToken,
        setAuth: (accessToken) => embeddedSupabase!.realtime.setAuth(accessToken),
      });
    });
  }

  await authorizeRealtimeBeforeJoin({
    getAccessToken: async () => {
      const { data, error } = await browserSupabase.auth.getSession();
      if (error) throw new Error('chat-realtime-session-failed', { cause: error });
      return data.session?.access_token ?? null;
    },
    setAuth: (accessToken) => browserSupabase.realtime.setAuth(accessToken),
  });
}

export async function installEmbeddedLease(candidate: EmbeddedContextCandidate): Promise<EmbeddedLeaseSnapshot> {
  const generation = ++embeddedAuthGeneration;
  return enqueueEmbeddedRealtime(async () => {
    if (generation !== embeddedAuthGeneration) throw new Error('embedded-install-stale');
    await embeddedSupabase?.realtime.setAuth(candidate.accessToken);
    if (generation !== embeddedAuthGeneration) throw new Error('embedded-install-stale');
    embeddedLeaseVault.install(candidate);
    return embeddedLeaseVault.snapshot();
  });
}

export function beginEmbeddedLeaseRenewal(): boolean {
  return embeddedLeaseVault.beginRenewal();
}

/** Clears the credential before awaiting channel/socket cleanup; embedded mode never falls back to browser Auth. */
export async function clearEmbeddedSupabaseContext(): Promise<void> {
  embeddedAuthGeneration += 1;
  embeddedLeaseVault.clear();
  if (!embeddedSupabase) return;
  await enqueueEmbeddedRealtime(async () => {
    await embeddedSupabase?.removeAllChannels();
    await embeddedSupabase?.realtime.setAuth(null);
  });
}

function createDefaultEmbeddedProofDependencies(): EmbeddedContextProofDependencies {
  const authVerifier = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return {
    nowSeconds: () => Math.floor(Date.now() / 1000),
    verifyUser: async (accessToken) => {
      const { data, error } = await authVerifier.auth.getUser(accessToken);
      if (error) throw new Error('embedded-auth-proof-failed');
      return data.user ? { id: data.user.id } : null;
    },
    loadMemberships: async (accessToken) => {
      const candidateClient = createEmbeddedDataClient(async () => accessToken, fetch.bind(globalThis));
      return loadMyChoirs(candidateClient);
    },
  };
}

export async function verifyEmbeddedSupabaseContext(
  candidate: EmbeddedContextCandidate,
  dependencies: EmbeddedContextProofDependencies = createDefaultEmbeddedProofDependencies(),
) {
  return verifyEmbeddedContext(candidate, dependencies);
}

// Supabase Edge Function helper — JWT otomatik eklenir
export async function callDriveFunction<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('drive-manager-v2', {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  return data as T;
}

export type UserRole = 'Şef' | 'Partisyon Şefi' | 'Korist';

export interface ChoirMember {
  id: string;
  choir_id: string;
  first_name: string;
  last_name: string;
  voice_group: string | null;
  sub_voice_group: string | null;
  auth_user_id: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  photo_url?: string | null;
  birth_date?: string | null;
  join_date?: string | null;
  school_id?: string | null;
  department_id?: string | null;
  favorite_song_id?: string | null;
  about_text?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  tiktok_url?: string | null;
  x_url?: string | null;
  // Joined/computed from related tables
  school_name?: string | null;
  department_name?: string | null;
  favorite_song_title?: string | null;
  favorite_song_composer?: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  icon: string;
  link_url: string | null;
  link_label: string | null;
  image_url: string | null;
  target_users?: string[];
  target_voice_groups?: string[];
  created_by: string;
  created_at: string;
  is_hidden: boolean;
  choir_members?: { 
    first_name: string; 
    last_name: string;
    choir_member_roles?: Array<{
      roles?: { name: string } | null;
    }> | null;
  } | null;
}

export interface Rehearsal {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  title: string;
  location: string;
  notes: string | null;
  collect_attendance: boolean;
  attendance_note: string | null;
  created_by: string | null;
}

export interface Attendance {
  id: string;
  rehearsal_id: string;
  member_id: string;
  status: 'pending' | 'approved' | 'rejected';
  checked_in_at: string;
  approved_by: string | null;
  approved_at: string | null;
  choir_members?: { first_name: string; last_name: string; voice_group: string | null };
}

// =============================================
// Drive entegrasyonu tipleri
// =============================================


export interface RepertoirePdfAnnotationRow {
  id: string;
  song_id: string;
  repertoire_file_id: string;
  page_number: number;
  layer_type: 'personal' | 'shared_voice_group' | 'shared_all';
  owner_member_id: string | null;
  target_voice_group: string | null;
  annotations_json: unknown;
  schema_version: number;
  revision: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepertoireSongComment {
  id: string;
  song_id: string;
  content_html: string;
  target_voice_group: string | null;
  audio_drive_file_id: string | null;
  audio_file_name: string | null;
  audio_mime_type: string | null;
  audio_file_size_bytes: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  choir_members?: { first_name: string; last_name: string; photo_url: string | null } | null;
}

export interface RepertoireSongTag {
  song_id: string;
  tag_id: string;
}

export interface SongAssignment {
  id: string;
  song_id: string;
  member_id: string;
  assigned_by: string | null;
  assigned_at: string;
  part_name?: string | null;
  choir_members?: { first_name: string; last_name: string; voice_group: string | null };
  repertoire?: { title: string; composer: string | null };
}

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  target_voice_group: string | null;
  drive_folder_id: string | null;
  created_by: string;
  is_active: boolean;
  is_locked?: boolean;
  locked_at?: string | null;
  locked_by?: string | null;
  created_at: string;
  updated_at: string;
  choir_members?: { 
    id: string;
    first_name: string; 
    last_name: string;
    choir_member_roles?: Array<{
      roles?: { name: string } | null;
    }> | null;
  } | null;
  submission?: AssignmentSubmission | null; // Mevcut kullanıcının teslimi
  submission_count?: number; // Şef için toplam teslim sayısı
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  member_id: string;
  drive_file_id: string;
  drive_web_view_link: string | null;
  drive_download_link: string | null;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  drive_member_folder_id: string | null;
  current_file_version_id?: string | null;
  submitted_at: string;
  updated_at: string;
  status?: 'pending' | 'approved' | 'rejected';
  submission_note?: string | null;
  reviewer_note?: string | null;
  reviewer_audio_drive_file_id?: string | null;
  reviewer_audio_file_version_id?: string | null;
  reviewer_audio_file_name?: string | null;
  reviewer_audio_mime_type?: string | null;
  reviewer_audio_file_size_bytes?: number | null;
  is_reviewer_note_hidden?: boolean;
  reviewer_note_history?: Array<Record<string, unknown>>;
  submission_note_history?: Array<Record<string, unknown>>;
  hidden_by?: string | null;
  hidden_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  choir_members?: { first_name: string; last_name: string; voice_group: string | null };
}

// Drive action payload tipleri
export interface DriveUploadResult {
  file_id: string;
  web_view_link: string;
  download_link: string;
  name: string;
  size: number;
}

export interface DriveFolderResult {
  folder_id: string;
  folder_name: string;
  web_view_link: string;
}

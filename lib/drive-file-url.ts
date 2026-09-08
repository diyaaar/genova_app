import { supabase, type RepertoireFile } from '@/lib/supabase';
import { requestProtectedRepertoireFileTicket } from '@/lib/repertuvar/protected-file-client';

interface CachedDriveUrl {
  url: string;
  expiresAt: number;
}

const driveUrlCache = new Map<string, CachedDriveUrl>();

function getCacheKey(
  userId: string,
  fileId: string,
  fileName: string | null | undefined,
  mimeType: string | null | undefined,
) {
  return `${userId}:${fileId}:${fileName ?? ''}:${mimeType ?? ''}`;
}

function getEndpoint() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) throw new Error('Dosya servisi yapılandırılmamış.');
  return `${baseUrl.replace(/\/+$/u, '')}/functions/v1/repertoire-file`;
}

export function clearProtectedDriveFileUrlCache() {
  driveUrlCache.clear();
}

async function requireCurrentSession() {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  const accessToken = session?.access_token;
  const userId = session?.user?.id;
  if (!accessToken || !userId) {
    throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  }
  return { accessToken, userId };
}

export async function getProtectedDriveFileUrl(file: Pick<RepertoireFile, 'drive_file_id' | 'file_name' | 'mime_type'>) {
  if (!file.drive_file_id) {
    return null;
  }

  const { accessToken, userId } = await requireCurrentSession();

  const cacheKey = getCacheKey(userId, `legacy:${file.drive_file_id}`, file.file_name, file.mime_type);
  const cached = driveUrlCache.get(cacheKey);
  if (cached && cached.expiresAt - Date.now() > 30_000) {
    return cached.url;
  }

  const response = await fetch('/api/drive-file-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      driveFileId: file.drive_file_id,
      fileName: file.file_name,
      mimeType: file.mime_type,
    }),
  });
  if (!response.ok) {
    throw new Error((await response.text()) || 'Dosya erişim bağlantısı oluşturulamadı.');
  }
  const payload = await response.json() as CachedDriveUrl;
  driveUrlCache.set(cacheKey, payload);
  return payload.url;
}

export async function getProtectedRepertoireFileUrl(
  file: Pick<RepertoireFile, 'id' | 'drive_file_id' | 'file_name' | 'mime_type'>,
) {
  if (!file.id || !file.drive_file_id) return null;
  const { accessToken, userId } = await requireCurrentSession();
  const cacheKey = getCacheKey(userId, `repertoire:${file.id}`, file.file_name, file.mime_type);
  const cached = driveUrlCache.get(cacheKey);
  if (cached && cached.expiresAt - Date.now() > 30_000) return cached.url;

  const payload = await requestProtectedRepertoireFileTicket({
    endpoint: getEndpoint(),
    accessToken,
    fileId: file.id,
  });
  driveUrlCache.set(cacheKey, payload);
  return payload.url;
}

import type { RepertoireFile } from './catalog-core';
import { supabase } from '../supabase';
import { authenticatedWebFetch, requireCurrentWebAccess } from '../web-auth-capability';

export const REPERTOIRE_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;

/** Release flag must follow compatible schema, private provider and Edge write/read deployment. */
export function isPrivateRepertoireUploadEnabled(): boolean {
  return process.env.NEXT_PUBLIC_REPERTOIRE_R2_UPLOAD_ENABLED === 'true';
}

const retryKeys = new WeakMap<File, Map<string, string>>();
const messages: Record<string, string> = {
  'unauthorized': 'Oturumunuz sona erdi. Yeniden giriş yapın.',
  'forbidden': 'Bu şarkıya dosya yükleme yetkiniz yok.',
  'upload-pending': 'Bu dosyanın yüklemesi hâlâ işleniyor. Biraz sonra aynı dosyayla tekrar deneyin.',
  'upload-conflict': 'Yükleme isteği önceki denemeyle eşleşmiyor.',
  'upload-reconciliation-required': 'Yükleme sonucu doğrulanamadı. Dosyayı tekrar eklemeyin; aynı yükleme isteğinin kontrol edilmesi gerekiyor.',
  'upload-unavailable': 'Dosya yükleme şu anda kullanılamıyor.',
  'size-exceeded': 'Dosya boyutu 100 MB sınırını aşıyor.',
  'unsupported-media': 'Bu yükleme için PDF veya desteklenen bir ses dosyası seçin.',
  'invalid-media': 'Dosyanın içeriği seçilen dosya türüyle eşleşmiyor.',
};

/** Sends the original File body to the Edge. No provider URL/credential or base64 crosses the client.
 * A retry with the same selected File and tenant context keeps its key through an uncertain response.
 */
export async function uploadPrivateRepertoireFile(input: {
  songId: string; file: File; fileType: 'sheet' | 'audio'; mimeType: string; partitionLabel?: string;
  retryKey?: string;
}): Promise<RepertoireFile> {
  if (input.file.size < 1 || input.file.size > REPERTOIRE_UPLOAD_MAX_BYTES) throw new Error(messages['size-exceeded']);
  const access = await requireCurrentWebAccess('mutation');
  const { data: choirId, error } = await supabase.rpc('current_choir_id');
  if (error || typeof choirId !== 'string') throw new Error('Aktif koro bulunamadı.');
  const metadata = { songId: input.songId, fileName: input.file.name, fileType: input.fileType,
    mimeType: input.mimeType, size: input.file.size, partitionLabel: input.partitionLabel ?? null };
  const scope = JSON.stringify([access.userId, choirId, metadata]);
  let keys = retryKeys.get(input.file);
  if (!keys) { keys = new Map(); retryKeys.set(input.file, keys); }
  const retryKey = input.retryKey ?? keys.get(scope) ?? crypto.randomUUID();
  keys.set(scope, retryKey);
  // Revalidate the session immediately before sending the original browser File stream.
  const current = await requireCurrentWebAccess('mutation');
  const active = await supabase.rpc('current_choir_id');
  if (current.userId !== access.userId || current.accessToken !== access.accessToken ||
    active.error || active.data !== choirId) throw new Error('Oturum veya koro değişti. Yüklemeyi yeniden başlatın.');
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!origin) throw new Error('Dosya hizmeti yapılandırılmamış.');
  const response = await authenticatedWebFetch(`${origin.replace(/\/$/, '')}/functions/v1/repertoire-upload`, {
    method: 'POST', headers: { 'Content-Type': input.mimeType,
      'X-Upload-Metadata': encodeURIComponent(JSON.stringify(metadata)), 'Idempotency-Key': retryKey },
    body: input.file,
  }, access);
  let result: { file?: RepertoireFile; error?: string };
  try { result = await response.json(); } catch { throw new Error('Yükleme yanıtı doğrulanamadı. Aynı dosyayla tekrar deneyin.'); }
  if (!response.ok) throw new Error(messages[result.error ?? ''] ?? 'Dosya yüklenemedi. Aynı dosyayla tekrar deneyin.');
  if (!result.file?.id || result.file.song_id !== input.songId) throw new Error('Yükleme yanıtı geçersiz.');
  keys.delete(scope);
  return result.file;
}

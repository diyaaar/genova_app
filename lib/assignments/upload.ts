import type { AssignmentSubmission } from '../supabase';
import { supabase } from '../supabase';
import { authenticatedWebFetch, requireCurrentWebAccess } from '../web-auth-capability';

export const ASSIGNMENT_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

export function isPrivateAssignmentUploadEnabled() {
  return process.env.NEXT_PUBLIC_ASSIGNMENT_R2_UPLOAD_ENABLED === 'true';
}

const retryKeys = new WeakMap<File, Map<string, string>>();
const messages: Record<string, string> = {
  unauthorized: 'Oturumunuz sona erdi. Yeniden giriş yapın.',
  forbidden: 'Bu ödeve teslim yapma yetkiniz yok veya ödev kilitli.',
  'upload-pending': 'Bu teslim hâlâ işleniyor. Biraz sonra aynı dosyayla tekrar deneyin.',
  'upload-conflict': 'Yükleme isteği önceki denemeyle eşleşmiyor.',
  'upload-reconciliation-required': 'Yükleme sonucu doğrulanamadı. Dosyayı tekrar eklemeyin; aynı teslim kontrol edilmelidir.',
  'upload-unavailable': 'Ödev teslimi şu anda kullanılamıyor.',
  'size-exceeded': 'Dosya boyutu 50 MB sınırını aşıyor.',
  'unsupported-media': 'Aktif web içeriği dosyaları desteklenmiyor.',
};

/** Streams the original File to the assignment Edge boundary. Provider keys and URLs never reach the client. */
export async function uploadPrivateAssignmentSubmission(input: {
  assignmentId: string; file: File; note?: string; retryKey?: string;
}): Promise<AssignmentSubmission> {
  if (input.file.size < 1) throw new Error('Dosya boş olamaz.');
  if (input.file.size > ASSIGNMENT_UPLOAD_MAX_BYTES) throw new Error(messages['size-exceeded']);
  const access = await requireCurrentWebAccess('mutation');
  const { data: choirId, error } = await supabase.rpc('current_choir_id');
  if (error || typeof choirId !== 'string') throw new Error('Aktif koro bulunamadı.');
  const metadata = {
    assignmentId: input.assignmentId, fileName: input.file.name,
    mimeType: input.file.type || 'application/octet-stream', size: input.file.size,
    note: input.note?.trim() || null,
  };
  const scope = JSON.stringify([access.userId, choirId, metadata]);
  let keys = retryKeys.get(input.file);
  if (!keys) { keys = new Map(); retryKeys.set(input.file, keys); }
  const retryKey = input.retryKey ?? keys.get(scope) ?? crypto.randomUUID();
  keys.set(scope, retryKey);
  const current = await requireCurrentWebAccess('mutation');
  const active = await supabase.rpc('current_choir_id');
  if (current.userId !== access.userId || current.accessToken !== access.accessToken ||
    active.error || active.data !== choirId) {
    throw new Error('Oturum veya koro değişti. Yüklemeyi yeniden başlatın.');
  }
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!origin) throw new Error('Dosya hizmeti yapılandırılmamış.');
  const response = await authenticatedWebFetch(
    `${origin.replace(/\/$/u,'')}/functions/v1/assignment-upload`,
    {
      method:'POST',headers:{'Content-Type':metadata.mimeType,
        'X-Upload-Metadata':encodeURIComponent(JSON.stringify(metadata)),'Idempotency-Key':retryKey},
      body:input.file,
    },
    access,
  );
  let result: { submission?: AssignmentSubmission; fileVersionId?: string; replayed?: boolean; error?: string };
  try { result = await response.json(); }
  catch { throw new Error('Yükleme yanıtı doğrulanamadı. Aynı dosyayla tekrar deneyin.'); }
  if (!response.ok) throw new Error(messages[result.error ?? ''] ?? 'Teslim yüklenemedi. Aynı dosyayla tekrar deneyin.');
  if (!result.submission?.id || result.submission.assignment_id !== input.assignmentId ||
    !result.fileVersionId || result.submission.current_file_version_id !== result.fileVersionId) {
    throw new Error('Teslim yanıtı geçersiz.');
  }
  if (result.replayed === false) {
    await authenticatedWebFetch('/api/assignment-submissions/upload', {
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'notify_private_upload',submissionId:result.submission.id,
        fileVersionId:result.fileVersionId}),
    }, access).catch(() => undefined);
  }
  keys.delete(scope);
  return result.submission;
}

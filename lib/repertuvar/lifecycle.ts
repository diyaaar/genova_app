import type { RepertoireFile } from './catalog-core';
import { authenticatedWebFetch, requireCurrentWebAccess } from '../web-auth-capability';
import { uploadPrivateRepertoireFile } from './upload';

interface LifecycleResponse {
  ready?: boolean;
  deleted?: boolean;
  cleanupPending?: boolean;
  error?: string;
}
const messages: Record<string,string> = {
  'annotated-pdf': 'Bu PDF üzerinde anotasyonlar var. Güvenli sürüm geçmişi tamamlanmadan değiştirilemez.',
  'unsupported-lifecycle': 'Karma Drive/R2 veya eksik dosya yaşam döngüsü henüz desteklenmiyor.',
  'cleanup-batch-too-large': 'Bu şarkının dosya temizliği tek işlem sınırını aşıyor.',
  'forbidden': 'Bu dosya işlemi için yetkiniz yok.',
  'lifecycle-conflict': 'Dosya işlemi başka bir istekle çakıştı.',
  'lifecycle-unavailable': 'Özel dosya yaşam döngüsü şu anda kullanılamıyor.',
};

async function callLifecycle(method: 'POST'|'DELETE', input: {
  targetType: 'file'|'song'; targetId: string; mode: 'delete'|'replacement'; retryKey?: string;
}) {
  const access = await requireCurrentWebAccess('mutation');
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!origin) throw new Error('Dosya hizmeti yapılandırılmamış.');
  const response = await authenticatedWebFetch(`${origin.replace(/\/$/,'')}/functions/v1/repertoire-file-lifecycle`, {
    method, headers: { 'Content-Type':'application/json', 'Idempotency-Key':input.retryKey ?? crypto.randomUUID() },
    body: JSON.stringify({ targetType:input.targetType,targetId:input.targetId,mode:input.mode }),
  }, access);
  let result: LifecycleResponse;
  try { result = await response.json(); } catch { throw new Error('Dosya işlemi yanıtı doğrulanamadı.'); }
  if (!response.ok && response.status !== 202) {
    throw new Error(messages[result.error ?? ''] ?? 'Dosya işlemi tamamlanamadı.');
  }
  return result;
}

export async function preflightPrivateRepertoireReplacement(fileId: string) {
  const result = await callLifecycle('POST',{ targetType:'file',targetId:fileId,mode:'replacement' });
  if (!result.ready) throw new Error('Dosya değiştirme kontrolü tamamlanamadı.');
}

export async function deletePrivateRepertoireFile(fileId: string, mode: 'delete'|'replacement' = 'delete') {
  const result = await callLifecycle('DELETE',{ targetType:'file',targetId:fileId,mode });
  if (!result.deleted) throw new Error('Dosya silme sonucu doğrulanamadı.');
  return { cleanupPending:Boolean(result.cleanupPending) };
}

export async function deletePrivateRepertoireSong(songId: string) {
  const result = await callLifecycle('DELETE',{ targetType:'song',targetId:songId,mode:'delete' });
  if (!result.deleted) throw new Error('Şarkı silme sonucu doğrulanamadı.');
  return { cleanupPending:Boolean(result.cleanupPending) };
}

/** Preflights annotation safety, verifies the new private object, then retires the old row. */
export async function replacePrivateRepertoireFile(input: {
  oldFile: RepertoireFile; file: File; fileType: 'sheet'|'audio'; mimeType: string; partitionLabel?: string;
}) {
  await preflightPrivateRepertoireReplacement(input.oldFile.id);
  const uploaded = await uploadPrivateRepertoireFile({ songId:input.oldFile.song_id,file:input.file,
    fileType:input.fileType,mimeType:input.mimeType,partitionLabel:input.partitionLabel });
  try {
    const deletion = await deletePrivateRepertoireFile(input.oldFile.id,'replacement');
    return { uploaded, ...deletion };
  } catch (error) {
    throw new Error(`Yeni dosya doğrulandı ancak eski dosya korunarak kaldı: ${error instanceof Error ? error.message : 'değiştirme tamamlanamadı.'}`);
  }
}

import { supabase } from '../supabase';
import { requireCurrentWebAccess } from '../web-auth-capability';
import { uploadPrivateRepertoireFile, REPERTOIRE_UPLOAD_MAX_BYTES } from './upload';

interface SongDraft {
  songId: string; retryKey: string; title: string; composer: string; fileName: string;
}
const PREFIX = 'genova:pending-repertoire-song:054:';

async function draftContext() {
  const access = await requireCurrentWebAccess('mutation');
  const { data: choirId, error } = await supabase.rpc('current_choir_id');
  if (error || typeof choirId !== 'string') throw new Error('Aktif koro bulunamadı.');
  return { key: `${PREFIX}${access.userId}:${choirId}`, choirId, access };
}

function readDraft(key: string): SongDraft | null {
  const value = sessionStorage.getItem(key);
  if (!value) return null;
  const draft = JSON.parse(value) as SongDraft;
  if (!draft.songId || !draft.retryKey || !draft.title || typeof draft.composer !== 'string' || !draft.fileName) {
    throw new Error('Bekleyen şarkı kaydı okunamadı.');
  }
  return draft;
}

export async function loadPendingRepertoireSong(): Promise<SongDraft | null> {
  return readDraft((await draftContext()).key);
}

/** A small tab-scoped draft preserves row/retry identities across a lost response or reload.
 * Never delete a possibly committed upload on error. No file bytes or tokens are stored here.
 */
export async function createPrivateRepertoireSong(title: string, composer: string, file: File) {
  if (!title.trim()) throw new Error('Şarkı adı zorunlu.');
  if (!file.size || file.size > REPERTOIRE_UPLOAD_MAX_BYTES) throw new Error('Dosya boyutu 1 bayt ile 100 MB arasında olmalı.');
  const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '');
  const fileType = mimeType === 'application/pdf' ? 'sheet' : 'audio';
  if (fileType === 'audio' && !['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/flac'].includes(mimeType)) {
    throw new Error('PDF veya desteklenen bir ses dosyası seçin.');
  }
  const context = await draftContext();
  let draft = readDraft(context.key);
  if (draft && (draft.title !== title.trim() || draft.composer !== composer.trim() || draft.fileName !== file.name)) {
    throw new Error(`Önce bekleyen “${draft.title}” şarkısını “${draft.fileName}” dosyasıyla tamamlayın.`);
  }
  if (!draft) {
    draft = { songId: crypto.randomUUID(), retryKey: crypto.randomUUID(), title: title.trim(),
      composer: composer.trim(), fileName: file.name };
    sessionStorage.setItem(context.key, JSON.stringify(draft));
  }
  const check = await supabase.from('repertoire').select('id, title, composer, choir_id').eq('id', draft.songId).maybeSingle();
  if (check.error) throw new Error('Bekleyen şarkı kontrol edilemedi. Tekrar deneyin.');
  if (check.data) {
    if (check.data.choir_id !== context.choirId || check.data.title !== draft.title ||
      (check.data.composer ?? '') !== draft.composer) throw new Error('Bekleyen şarkının bilgileri değişti.');
  } else {
    const current = await draftContext();
    if (current.key !== context.key || current.access.accessToken !== context.access.accessToken) {
      throw new Error('Oturum veya koro değişti. Yeniden deneyin.');
    }
    const inserted = await supabase.from('repertoire').insert({ id: draft.songId, choir_id: context.choirId,
      title: draft.title, composer: draft.composer || null, is_visible: true });
    if (inserted.error) throw new Error('Şarkı kaydı doğrulanamadı. Aynı dosyayla tekrar deneyin.');
  }
  const finalContext = await draftContext();
  if (finalContext.key !== context.key) throw new Error('Oturum veya koro değişti. Yeniden deneyin.');
  await uploadPrivateRepertoireFile({ songId: draft.songId, file, fileType, mimeType, retryKey: draft.retryKey });
  sessionStorage.removeItem(context.key);
}

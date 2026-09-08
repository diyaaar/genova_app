import { Directory, File, FileMode, Paths } from 'expo-file-system';
import type { PrivateScoreFileStore } from './private-file-store';
import { assertAllowedScoreFileSize, hasPdfHeader } from './reader-contract';

const ROOT_NAME = 'genova-protected-repertoire';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function removeIfPresent(file: File) {
  if (file.exists) file.delete();
}

function assertPdf(file: File) {
  if (!file.exists || file.size < 5) throw new Error('PDF dosyası boş veya eksik.');
  assertAllowedScoreFileSize(file.size);
  const handle = file.open(FileMode.ReadOnly);
  try {
    if (!hasPdfHeader(handle.readBytes(5))) throw new Error('İndirilen dosya geçerli bir PDF değil.');
  } finally {
    handle.close();
  }
}

export function createExpoPrivateScoreFileStore(): PrivateScoreFileStore {
  const root = new Directory(Paths.cache, ROOT_NAME);
  return {
    async download({ url, choirId, fileId, signal }) {
      if (!UUID_PATTERN.test(choirId) || !UUID_PATTERN.test(fileId)) {
        throw new Error('Koro veya dosya kimliği geçersiz.');
      }
      root.create({ idempotent: true, intermediates: true });
      const scope = new Directory(root, choirId);
      scope.create({ idempotent: true, intermediates: true });
      const partial = new File(scope, `${fileId}.part`);
      const finalFile = new File(scope, `${fileId}.pdf`);
      removeIfPresent(partial);
      removeIfPresent(finalFile);
      try {
        const downloaded = await File.downloadFileAsync(url, partial, { signal });
        assertPdf(downloaded);
        await downloaded.move(finalFile);
        return { uri: finalFile.uri, size: finalFile.size };
      } catch (error) {
        removeIfPresent(partial);
        removeIfPresent(finalFile);
        if (signal.aborted) throw new Error('PDF indirme işlemi durduruldu.');
        throw error;
      }
    },
    async remove(uri) {
      const file = new File(uri);
      removeIfPresent(file);
    },
    async clear() {
      if (root.exists) root.delete();
    },
  };
}

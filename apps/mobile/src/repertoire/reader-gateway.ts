import type { RepertoireFile } from '@shared/repertuvar/catalog-core';
import { requestProtectedRepertoireFileTicket } from '@shared/repertuvar/protected-file-client';
import type { NativeAnnotationSource } from './annotation-source';
import type { NativePdfRenderer } from './pdf-renderer';
import type { PrivateScoreFileStore } from './private-file-store';
import {
  getRenderWindowPages,
  assertAllowedScoreFileSize,
  isScorePdf,
  toNativePdfPageIndex,
  type NativeRenderedPageWindow,
  type NativeScoreDocument,
  type NativeScoreReaderGateway,
} from './reader-contract';

export interface ReaderSessionSource {
  getAccessToken(): Promise<string | null>;
}

export function createNativeScoreReaderGateway(deps: {
  endpoint: string;
  session: ReaderSessionSource;
  annotations: NativeAnnotationSource;
  files: PrivateScoreFileStore;
  pdf: NativePdfRenderer;
  requestTicket?: typeof requestProtectedRepertoireFileTicket;
}): NativeScoreReaderGateway {
  let activeUri: string | null = null;
  let abortController: AbortController | null = null;
  let renderedWindow = false;
  let operationVersion = 0;

  function assertCurrentOperation(version: number, uri?: string) {
    if (operationVersion !== version || (uri !== undefined && activeUri !== uri)) {
      throw new Error('PDF oturumu artık geçerli değil.');
    }
  }

  async function cleanupActive(uri: string) {
    if (activeUri !== uri) return;
    abortController?.abort();
    abortController = null;
    try {
      await deps.pdf.close(uri);
    } catch {
      // A corrupt PDF may fail before the native handle exists; private-file cleanup still runs.
    }
    await deps.files.remove(uri);
    activeUri = null;
    renderedWindow = false;
  }

  async function close(uri: string) {
    operationVersion += 1;
    await cleanupActive(uri);
  }

  return {
    async open({ choirId, file }: { choirId: string; file: RepertoireFile }) {
      if (!isScorePdf(file)) throw new Error('Bu dosya PDF nota olarak açılamaz.');
      assertAllowedScoreFileSize(file.file_size_bytes);
      if (activeUri) await cleanupActive(activeUri);
      const version = ++operationVersion;
      const accessToken = await deps.session.getAccessToken();
      assertCurrentOperation(version);
      if (!accessToken) throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');

      const controller = new AbortController();
      abortController = controller;
      let uri: string | null = null;
      try {
        const ticket = await (deps.requestTicket ?? requestProtectedRepertoireFileTicket)({
          endpoint: deps.endpoint,
          accessToken,
          fileId: file.id,
        });
        assertCurrentOperation(version);
        const downloaded = await deps.files.download({
          url: ticket.url,
          choirId,
          fileId: file.id,
          signal: controller.signal,
        });
        uri = downloaded.uri;
        assertCurrentOperation(version);
        activeUri = uri;
        const [{ pageCount }, annotations] = await Promise.all([
          deps.pdf.open(uri),
          deps.annotations.load(file.id),
        ]);
        assertCurrentOperation(version, uri);
        if (!Number.isInteger(pageCount) || pageCount < 1) {
          throw new Error('PDF içinde okunabilir sayfa bulunamadı.');
        }
        const document: NativeScoreDocument = {
          choirId,
          fileId: file.id,
          fileName: file.file_name,
          uri,
          pageCount,
          annotations,
        };
        return document;
      } catch (error) {
        if (uri && activeUri === uri && operationVersion === version) {
          await cleanupActive(uri);
        } else if (uri && activeUri !== uri) {
          await deps.files.remove(uri);
        }
        if (abortController === controller) abortController = null;
        throw error;
      }
    },
    async renderWindow(document, pageNumber): Promise<NativeRenderedPageWindow> {
      if (activeUri !== document.uri) throw new Error('PDF oturumu artık geçerli değil.');
      const version = operationVersion;
      const pages = getRenderWindowPages(pageNumber, document.pageCount);
      // The native library retains generated images until close(). Re-open between windows so
      // traversing a long score never accumulates all page bitmaps in native temporary storage.
      if (renderedWindow) {
        await deps.pdf.close(document.uri);
        assertCurrentOperation(version, document.uri);
        const reopened = await deps.pdf.open(document.uri);
        assertCurrentOperation(version, document.uri);
        if (reopened.pageCount !== document.pageCount) {
          throw new Error('PDF sayfa bilgisi değişti.');
        }
      }
      const images: NativeRenderedPageWindow['pages'] = {};
      for (const page of pages) {
        images[page] = await deps.pdf.generate(document.uri, toNativePdfPageIndex(page));
        assertCurrentOperation(version, document.uri);
      }
      renderedWindow = true;
      return { currentPage: pageNumber, pages: images };
    },
    close,
    async clear() {
      operationVersion += 1;
      abortController?.abort();
      if (activeUri) await cleanupActive(activeUri);
      await deps.files.clear();
    },
  };
}

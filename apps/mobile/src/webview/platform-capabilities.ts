import * as Clipboard from 'expo-clipboard';
import { Directory, DownloadTask, File, FileMode, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  canonicalizeBridgeFileRequestUrl,
  type AppRoutePolicy,
  type BridgePayloads,
} from '@shared/mobile-webview-bridge';
import { createBridgeCorrelationId } from './random';

export const MAX_WEBVIEW_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PROTECTED_FILE_BYTES = 50 * 1024 * 1024;

const ACTIVE_MIME_TYPES = new Set([
  'application/ecmascript',
  'application/javascript',
  'application/xhtml+xml',
  'application/xml',
  'image/svg+xml',
  'text/ecmascript',
  'text/html',
  'text/javascript',
  'text/xml',
]);
const ACTIVE_EXTENSION = /\.(?:html?|xhtml?|svgz?|xml|xsl|xslt|js|mjs)$/iu;
const PASSIVE_MIME_TYPES = new Set([
  'application/octet-stream',
  'application/pdf',
  'application/rtf',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
  'audio/aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'image/avif',
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'text/plain',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);
const PASSIVE_EXTENSION = /\.(?:aac|avif|bmp|csv|docx?|gif|jpe?g|m4a|mov|mp3|mp4|oga|ogg|pdf|png|pptx?|rtf|txt|wav|webm|webp|xlsx?|zip)$/iu;
const MIME_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/u;

export interface PreparedProtectedFileRequest {
  requestId: string;
  canonicalUrl: string;
  disposition: 'view' | 'download';
  fileName: string;
  mimeType: string;
}

function normalizeMimeType(value: string | undefined): string {
  return value?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

function safeFileName(value: string | undefined, mimeType: string): string {
  const fallback = mimeType === 'application/pdf' ? 'Genova-dosyasi.pdf' : 'Genova-dosyasi';
  if (!value || value.trim() !== value || value.length > 255
    || /[\\/\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value)) return fallback;
  return value;
}

export function prepareProtectedFileRequest(
  input: BridgePayloads['file.open.request'] & { requestId: string },
  routePolicy: AppRoutePolicy,
): PreparedProtectedFileRequest | null {
  const canonicalUrl = canonicalizeBridgeFileRequestUrl(input.url, routePolicy);
  if (!canonicalUrl) return null;
  const mimeType = normalizeMimeType(input.mimeType);
  const fileName = safeFileName(input.fileName, mimeType);
  if ((mimeType && (!MIME_PATTERN.test(mimeType) || ACTIVE_MIME_TYPES.has(mimeType) || mimeType.endsWith('+xml')))
    || ACTIVE_EXTENSION.test(fileName)) return null;
  if ((!mimeType || mimeType === 'application/octet-stream') && !PASSIVE_EXTENSION.test(fileName)) return null;
  if (mimeType && !PASSIVE_MIME_TYPES.has(mimeType)) return null;
  return Object.freeze({
    requestId: input.requestId,
    canonicalUrl,
    disposition: input.disposition,
    fileName,
    mimeType: mimeType || 'application/octet-stream',
  });
}

export const WEBVIEW_IMAGE_INPUT_POLICY = `(() => {
  const allowed = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  const maxBytes = ${MAX_WEBVIEW_IMAGE_BYTES};
  const reject = (input, message) => {
    input.value = '';
    input.setCustomValidity(message);
    input.reportValidity?.();
    input.dispatchEvent(new CustomEvent('genova:file-rejected', { bubbles: true, detail: { code: 'image-rejected' } }));
  };
  const configure = (input) => {
    const requested = input.getAttribute('accept') || '';
    const imageOnly = requested.split(',').every((part) => {
      const value = part.trim().toLowerCase();
      return value === 'image/*' || allowed.has(value) || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(value);
    });
    if (!requested || !imageOnly) {
      input.disabled = true;
      input.setAttribute('aria-disabled', 'true');
      input.setAttribute('title', 'Bu dosya türü mobil uygulamada desteklenmiyor.');
      return;
    }
    input.disabled = false;
    input.removeAttribute('aria-disabled');
    input.removeAttribute('capture');
    input.removeAttribute('multiple');
    input.setAttribute('accept', 'image/jpeg,image/png,image/gif,image/webp');
    if (input.dataset.genovaImagePolicy === '1') return;
    input.dataset.genovaImagePolicy = '1';
    input.addEventListener('click', () => input.setCustomValidity(''));
    input.addEventListener('change', () => {
      input.setCustomValidity('');
      const files = Array.from(input.files || []);
      if (files.length === 0) { input.dispatchEvent(new CustomEvent('genova:file-cancelled', { bubbles: true })); return; }
      if (files.length !== 1) { reject(input, 'Yalnızca bir görsel seçebilirsiniz.'); return; }
      const file = files[0];
      if (!allowed.has((file.type || '').toLowerCase())) { reject(input, 'JPEG, PNG, GIF veya WebP seçin.'); return; }
      if (file.size > maxBytes) reject(input, 'Görsel 5 MB altında olmalıdır.');
    }, true);
  };
  const scan = (root) => root.querySelectorAll?.('input[type="file"]').forEach(configure);
  scan(document);
  new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node instanceof Element) { if (node.matches('input[type="file"]')) configure(node); scan(node); }
  }))).observe(document.documentElement, { childList: true, subtree: true });
  true;
})();`;

export interface EphemeralFileStore {
  download(input: {
    url: string;
    fileName: string;
    mimeType: string;
    signal: AbortSignal;
  }): Promise<{ uri: string; size: number }>;
  remove(uri: string): Promise<void>;
  clear(): Promise<void>;
}

export interface NativeShareGateway {
  isAvailable(): Promise<boolean>;
  share(uri: string, options: { mimeType: string; dialogTitle: string }): Promise<void>;
}

function fileSuffix(fileName: string): string {
  const match = /\.[a-z0-9]{1,8}$/iu.exec(fileName);
  return match?.[0]?.toLowerCase() ?? '';
}

function startsWith(bytes: Uint8Array, expected: readonly number[], offset = 0): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function asciiPrefix(bytes: Uint8Array): string {
  return Array.from(bytes.slice(0, 512), (byte) => (
    byte === 0 ? '' : byte < 128 ? String.fromCharCode(byte) : ' '
  )).join('').toLowerCase();
}

function inferredContentClass(mimeType: string, fileName: string): string {
  if (mimeType !== 'application/octet-stream') return mimeType;
  const suffix = fileSuffix(fileName);
  if (suffix === '.pdf') return 'application/pdf';
  if (['.docx', '.pptx', '.xlsx', '.zip'].includes(suffix)) return 'application/zip';
  if (['.jpg', '.jpeg'].includes(suffix)) return 'image/jpeg';
  if (suffix === '.png') return 'image/png';
  if (suffix === '.gif') return 'image/gif';
  if (suffix === '.webp') return 'image/webp';
  return mimeType;
}

/** Refuses obvious active or malformed bytes before a downloaded file reaches another app. */
export function hasExpectedPassiveFileSignature(
  bytes: Uint8Array,
  mimeType: string,
  fileName: string,
): boolean {
  if (bytes.length < 1) return false;
  const prefix = asciiPrefix(bytes);
  if (/<!doctype\s+html|<html(?:\s|>)|<svg(?:\s|>)|<script(?:\s|>)|<\?xml/u.test(prefix)) return false;

  switch (inferredContentClass(mimeType, fileName)) {
    case 'application/pdf':
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    case 'application/zip':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])
        || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])
        || startsWith(bytes, [0x50, 0x4b, 0x07, 0x08]);
    case 'image/jpeg':
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/gif':
      return prefix.startsWith('gif87a') || prefix.startsWith('gif89a');
    case 'image/webp':
      return prefix.startsWith('riff') && prefix.slice(8, 12) === 'webp';
    case 'image/bmp':
      return prefix.startsWith('bm');
    case 'application/rtf':
      return prefix.startsWith('{\\rtf');
    case 'application/msword':
    case 'application/vnd.ms-excel':
    case 'application/vnd.ms-powerpoint':
      return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    default:
      return true;
  }
}

function validateDownloadedFile(file: File, mimeType: string, fileName: string) {
  const handle = file.open(FileMode.ReadOnly);
  try {
    const bytes = handle.readBytes(Math.min(file.size, 512));
    if (!hasExpectedPassiveFileSignature(bytes, mimeType, fileName)) {
      throw new Error('file-content-mismatch');
    }
  } finally {
    handle.close();
  }
}

export function createExpoEphemeralFileStore(): EphemeralFileStore {
  const root = new Directory(Paths.cache, 'genova-webview-files');
  return {
    async download({ url, fileName, mimeType, signal }) {
      root.create({ idempotent: true, intermediates: true });
      const destination = new File(root, `${createBridgeCorrelationId()}${fileSuffix(fileName)}`);
      if (destination.exists) destination.delete();
      const task = new DownloadTask(url, destination, {
        signal,
        sessionType: 'foreground',
      });
      try {
        const downloaded = await task.downloadAsync();
        if (!downloaded) throw new Error('file-download-paused');
        if (!downloaded.exists || downloaded.size < 1) throw new Error('file-empty');
        if (downloaded.size > MAX_PROTECTED_FILE_BYTES) throw new Error('file-too-large');
        validateDownloadedFile(downloaded, mimeType, fileName);
        return { uri: downloaded.uri, size: downloaded.size };
      } catch (error) {
        if (destination.exists) destination.delete();
        throw error;
      } finally {
        task.release();
      }
    },
    async remove(uri) {
      const file = new File(uri);
      if (file.exists) file.delete();
    },
    async clear() {
      if (root.exists) root.delete();
    },
  };
}

export function createExpoClipboardWriter() {
  return async (text: string): Promise<boolean> => Clipboard.setStringAsync(text);
}

export function createExpoShareGateway(): NativeShareGateway {
  return {
    isAvailable: () => Sharing.isAvailableAsync(),
    share: (uri, options) => Sharing.shareAsync(uri, options),
  };
}

export class ProtectedFileCapability {
  private abortController: AbortController | null = null;
  private activeUri: string | null = null;

  constructor(
    private readonly files: EphemeralFileStore,
    private readonly sharing: NativeShareGateway,
  ) {}

  async run(request: PreparedProtectedFileRequest): Promise<boolean> {
    if (this.abortController) return false;
    const controller = new AbortController();
    this.abortController = controller;
    try {
      if (!await this.sharing.isAvailable()) return false;
      const downloaded = await this.files.download({
        url: request.canonicalUrl,
        fileName: request.fileName,
        mimeType: request.mimeType,
        signal: controller.signal,
      });
      this.activeUri = downloaded.uri;
      if (controller.signal.aborted || downloaded.size < 1 || downloaded.size > MAX_PROTECTED_FILE_BYTES) return false;
      await this.sharing.share(downloaded.uri, {
        mimeType: request.mimeType,
        dialogTitle: request.disposition === 'view' ? `${request.fileName} dosyasını aç` : `${request.fileName} dosyasını kaydet`,
      });
      return !controller.signal.aborted;
    } catch {
      return false;
    } finally {
      const uri = this.activeUri;
      this.activeUri = null;
      this.abortController = null;
      if (uri) await this.files.remove(uri);
    }
  }

  async clear(): Promise<void> {
    this.abortController?.abort();
    const uri = this.activeUri;
    this.activeUri = null;
    if (uri) await this.files.remove(uri);
    await this.files.clear();
  }
}

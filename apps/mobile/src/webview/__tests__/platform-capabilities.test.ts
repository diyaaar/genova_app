import { APP_WEB_ORIGIN } from '@shared/mobile-webview-bridge';
import {
  MAX_PROTECTED_FILE_BYTES,
  MAX_WEBVIEW_IMAGE_BYTES,
  ProtectedFileCapability,
  WEBVIEW_IMAGE_INPUT_POLICY,
  hasExpectedPassiveFileSignature,
  prepareProtectedFileRequest,
  type EphemeralFileStore,
  type NativeShareGateway,
} from '../platform-capabilities';

function request(overrides: Partial<Parameters<typeof prepareProtectedFileRequest>[0]> = {}) {
  return {
    requestId: 'request_1234567890abcdef',
    url: '/api/drive-file/file_1?token=signed',
    disposition: 'view' as const,
    fileName: 'Tenor.pdf',
    mimeType: 'application/pdf',
    ...overrides,
  };
}

function createRuntime() {
  const files: EphemeralFileStore = {
    download: jest.fn(async () => ({ uri: 'file:///cache/tenor.pdf', size: 128 })),
    remove: jest.fn(async () => {}),
    clear: jest.fn(async () => {}),
  };
  const sharing: NativeShareGateway = {
    isAvailable: jest.fn(async () => true),
    share: jest.fn(async () => {}),
  };
  return { files, sharing, capability: new ProtectedFileCapability(files, sharing) };
}

describe('WebView platform capability policy', () => {
  it('canonicalizes a passive protected file and exposes no URL in display metadata', () => {
    expect(prepareProtectedFileRequest(request(), { appOrigin: APP_WEB_ORIGIN })).toEqual({
      requestId: 'request_1234567890abcdef',
      canonicalUrl: `${APP_WEB_ORIGIN}/api/drive-file/file_1?token=signed`,
      disposition: 'view',
      fileName: 'Tenor.pdf',
      mimeType: 'application/pdf',
    });
  });

  it.each([
    { mimeType: 'text/html', fileName: 'safe.pdf' },
    { mimeType: 'image/svg+xml', fileName: 'image.svg' },
    { mimeType: 'application/octet-stream', fileName: 'unknown.bin' },
    { mimeType: 'application/pdf', fileName: 'payload.html' },
    { mimeType: 'application/octet-stream', fileName: 'safe.pdf\u202Etxt' },
    { url: 'javascript:alert(1)' },
  ])('rejects active, unknown or unsafe descriptor %#', (overrides) => {
    expect(prepareProtectedFileRequest(request(overrides), { appOrigin: APP_WEB_ORIGIN })).toBeNull();
  });

  it('configures accepted inputs as one bounded image and disables other file classes', () => {
    expect(WEBVIEW_IMAGE_INPUT_POLICY).toContain("removeAttribute('capture')");
    expect(WEBVIEW_IMAGE_INPUT_POLICY).toContain("removeAttribute('multiple')");
    expect(WEBVIEW_IMAGE_INPUT_POLICY).toContain('image/jpeg,image/png,image/gif,image/webp');
    expect(WEBVIEW_IMAGE_INPUT_POLICY).toContain(String(MAX_WEBVIEW_IMAGE_BYTES));
    expect(WEBVIEW_IMAGE_INPUT_POLICY).toContain('input.disabled = true');
  });

  it('refuses active or malformed bytes even when passive metadata claims a PDF', () => {
    expect(hasExpectedPassiveFileSignature(
      new TextEncoder().encode('%PDF-1.4\n'),
      'application/pdf',
      'safe.pdf',
    )).toBe(true);
    expect(hasExpectedPassiveFileSignature(
      new TextEncoder().encode('<!doctype html><script>alert(1)</script>'),
      'application/pdf',
      'safe.pdf',
    )).toBe(false);
    expect(hasExpectedPassiveFileSignature(
      new TextEncoder().encode('not a PDF'),
      'application/pdf',
      'safe.pdf',
    )).toBe(false);
  });
});

describe('ephemeral protected file operation', () => {
  it('downloads only after confirmation, opens the requested action sheet and always removes the file', async () => {
    const runtime = createRuntime();
    const prepared = prepareProtectedFileRequest(request(), { appOrigin: APP_WEB_ORIGIN })!;

    await expect(runtime.capability.run(prepared)).resolves.toBe(true);

    expect(runtime.files.download).toHaveBeenCalledWith(expect.objectContaining({
      url: prepared.canonicalUrl,
      fileName: 'Tenor.pdf',
      mimeType: 'application/pdf',
      signal: expect.any(AbortSignal),
    }));
    expect(runtime.sharing.share).toHaveBeenCalledWith('file:///cache/tenor.pdf', {
      mimeType: 'application/pdf', dialogTitle: 'Tenor.pdf dosyasını aç',
    });
    expect(runtime.files.remove).toHaveBeenCalledWith('file:///cache/tenor.pdf');
  });

  it('refuses unavailable, oversize and duplicate actions without leaving a file', async () => {
    const unavailable = createRuntime();
    (unavailable.sharing.isAvailable as jest.Mock).mockResolvedValue(false);
    await expect(unavailable.capability.run(prepareProtectedFileRequest(request(), { appOrigin: APP_WEB_ORIGIN })!)).resolves.toBe(false);
    expect(unavailable.files.download).not.toHaveBeenCalled();

    let release!: (value: { uri: string; size: number }) => void;
    const pending = new Promise<{ uri: string; size: number }>((resolve) => { release = resolve; });
    const busy = createRuntime();
    (busy.files.download as jest.Mock).mockImplementation(() => pending);
    const first = busy.capability.run(prepareProtectedFileRequest(request(), { appOrigin: APP_WEB_ORIGIN })!);
    await expect(busy.capability.run(prepareProtectedFileRequest(request({ disposition: 'download' }), { appOrigin: APP_WEB_ORIGIN })!)).resolves.toBe(false);
    release({ uri: 'file:///cache/too-large.pdf', size: MAX_PROTECTED_FILE_BYTES + 1 });
    await expect(first).resolves.toBe(false);
    expect(busy.sharing.share).not.toHaveBeenCalled();
    expect(busy.files.remove).toHaveBeenCalledWith('file:///cache/too-large.pdf');
  });

  it('aborts and cleans late download work when tenant clear wins', async () => {
    let release!: (value: { uri: string; size: number }) => void;
    const pending = new Promise<{ uri: string; size: number }>((resolve) => { release = resolve; });
    const runtime = createRuntime();
    (runtime.files.download as jest.Mock).mockImplementation(() => pending);
    const run = runtime.capability.run(prepareProtectedFileRequest(request(), { appOrigin: APP_WEB_ORIGIN })!);

    await runtime.capability.clear();
    release({ uri: 'file:///cache/late.pdf', size: 128 });
    await expect(run).resolves.toBe(false);
    expect(runtime.files.clear).toHaveBeenCalled();
    expect(runtime.files.remove).toHaveBeenCalledWith('file:///cache/late.pdf');
    expect(runtime.sharing.share).not.toHaveBeenCalled();
  });
});

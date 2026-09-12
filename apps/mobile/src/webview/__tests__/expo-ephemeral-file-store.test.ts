const mockDownloadAsync = jest.fn();
const mockRelease = jest.fn();
const mockDownloadTask = jest.fn();
const mockDestinationDelete = jest.fn();
const mockRootCreate = jest.fn();
const mockReadBytes = jest.fn();
const mockHandleClose = jest.fn();
let mockDestinationExists = false;

jest.mock('expo-file-system', () => {
  class MockDirectory {
    uri: string;
    exists = false;
    create = mockRootCreate;
    delete = jest.fn();

    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = parts.map((part) => typeof part === 'string' ? part : part.uri).join('/');
    }
  }

  class MockFile {
    uri: string;
    size = 0;
    delete = mockDestinationDelete;

    get exists() {
      return mockDestinationExists;
    }

    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = parts.map((part) => typeof part === 'string' ? part : part.uri).join('/');
    }
  }

  class MockDownloadTask {
    downloadAsync = mockDownloadAsync;
    release = mockRelease;

    constructor(...args: unknown[]) {
      mockDownloadTask(...args);
    }
  }

  return {
    Directory: MockDirectory,
    DownloadTask: MockDownloadTask,
    File: MockFile,
    FileMode: { ReadOnly: 'readonly' },
    Paths: { cache: { uri: 'file:///cache' } },
  };
});

import {
  MAX_PROTECTED_FILE_BYTES,
  createExpoEphemeralFileStore,
} from '../platform-capabilities';

describe('Expo ephemeral file store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDestinationExists = false;
    mockReadBytes.mockReturnValue(new TextEncoder().encode('%PDF-1.4\n'));
  });

  it('uses a cancellable foreground task and releases its native handle', async () => {
    mockDownloadAsync.mockResolvedValue({
      exists: true,
      size: 125,
      uri: 'file:///cache/genova-webview-files/runtime.pdf',
      open: () => ({ readBytes: mockReadBytes, close: mockHandleClose }),
    });
    const signal = new AbortController().signal;

    await expect(createExpoEphemeralFileStore().download({
      url: 'https://app.genesinovachoir.com/protected.pdf',
      fileName: 'runtime.pdf',
      mimeType: 'application/pdf',
      signal,
    })).resolves.toEqual({
      size: 125,
      uri: 'file:///cache/genova-webview-files/runtime.pdf',
    });

    expect(mockRootCreate).toHaveBeenCalledWith({ idempotent: true, intermediates: true });
    expect(mockDownloadTask).toHaveBeenCalledWith(
      'https://app.genesinovachoir.com/protected.pdf',
      expect.any(Object),
      expect.objectContaining({
        sessionType: 'foreground',
        signal,
      }),
    );
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(mockHandleClose).toHaveBeenCalledTimes(1);
  });

  it('removes an oversize download before returning the policy failure', async () => {
    mockDownloadAsync.mockImplementation(async () => {
      mockDestinationExists = true;
      return {
        exists: true,
        size: MAX_PROTECTED_FILE_BYTES + 1,
        uri: 'file:///cache/genova-webview-files/oversize.pdf',
      };
    });

    await expect(createExpoEphemeralFileStore().download({
      url: 'https://app.genesinovachoir.com/oversize.pdf',
      fileName: 'oversize.pdf',
      mimeType: 'application/pdf',
      signal: new AbortController().signal,
    })).rejects.toThrow('file-too-large');

    expect(mockDestinationDelete).toHaveBeenCalledTimes(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('deletes an active body masquerading as a PDF', async () => {
    mockDownloadAsync.mockImplementation(async () => {
      mockDestinationExists = true;
      return {
        exists: true,
        size: 48,
        uri: 'file:///cache/genova-webview-files/disguised.pdf',
        open: () => ({
          readBytes: () => new TextEncoder().encode('<html><script>alert(1)</script></html>'),
          close: mockHandleClose,
        }),
      };
    });

    await expect(createExpoEphemeralFileStore().download({
      url: 'https://app.genesinovachoir.com/disguised.pdf',
      fileName: 'disguised.pdf',
      mimeType: 'application/pdf',
      signal: new AbortController().signal,
    })).rejects.toThrow('file-content-mismatch');

    expect(mockDestinationDelete).toHaveBeenCalledTimes(1);
    expect(mockHandleClose).toHaveBeenCalledTimes(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});

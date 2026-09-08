const mockFileRegistry = new Map<string, { exists: boolean; size: number; bytes: number[]; deleted: boolean }>();
let mockDownloadBytes = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31];
let mockDownloadSize: number | null = null;
let mockDownloadError: Error | null = null;
let mockRootDeleted = false;

jest.mock('expo-file-system', () => {
  class MockDirectory {
    uri: string;
    exists = false;
    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = parts.map((part) => typeof part === 'string' ? part : part.uri).join('/').replace(/([^:]\/)\/+/g, '$1');
    }
    create() { this.exists = true; }
    delete() { this.exists = false; mockRootDeleted = true; }
  }
  class MockFile {
    uri: string;
    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = parts.map((part) => typeof part === 'string' ? part : part.uri).join('/').replace(/([^:]\/)\/+/g, '$1');
      if (!mockFileRegistry.has(this.uri)) mockFileRegistry.set(this.uri, { exists: false, size: 0, bytes: [], deleted: false });
    }
    get exists() { return mockFileRegistry.get(this.uri)?.exists ?? false; }
    get size() { return mockFileRegistry.get(this.uri)?.size ?? 0; }
    delete() {
      const entry = mockFileRegistry.get(this.uri)!;
      entry.exists = false;
      entry.deleted = true;
    }
    open() {
      const entry = mockFileRegistry.get(this.uri)!;
      return { readBytes: (length: number) => new Uint8Array(entry.bytes.slice(0, length)), close: jest.fn() };
    }
    async move(target: MockFile) {
      const source = mockFileRegistry.get(this.uri)!;
      const destination = mockFileRegistry.get(target.uri)!;
      destination.exists = true;
      destination.size = source.size;
      destination.bytes = [...source.bytes];
      source.exists = false;
    }
    static async downloadFileAsync(_url: string, destination: MockFile) {
      const entry = mockFileRegistry.get(destination.uri)!;
      entry.exists = true;
      entry.size = mockDownloadSize ?? mockDownloadBytes.length;
      entry.bytes = [...mockDownloadBytes];
      if (mockDownloadError) throw mockDownloadError;
      return destination;
    }
  }
  return {
    Directory: MockDirectory,
    File: MockFile,
    FileMode: { ReadOnly: 'r' },
    Paths: { cache: { uri: 'file:///cache' } },
  };
});

import { createExpoPrivateScoreFileStore } from '../expo-private-file-store';

const CHOIR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FILE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('Expo private score store', () => {
  beforeEach(() => {
    mockFileRegistry.clear();
    mockDownloadBytes = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31];
    mockDownloadSize = null;
    mockDownloadError = null;
    mockRootDeleted = false;
  });

  it('moves a validated PDF from a partial name to the tenant-scoped private name', async () => {
    const store = createExpoPrivateScoreFileStore();
    const result = await store.download({
      url: 'https://example.test/file?ticket=signed',
      choirId: CHOIR,
      fileId: FILE_ID,
      signal: new AbortController().signal,
    });
    expect(result.uri).toContain(`${CHOIR}/${FILE_ID}.pdf`);
    expect(mockFileRegistry.get(result.uri)?.exists).toBe(true);
    expect(Array.from(mockFileRegistry.keys()).find((uri) => uri.endsWith('.part')) &&
      mockFileRegistry.get(Array.from(mockFileRegistry.keys()).find((uri) => uri.endsWith('.part'))!)?.exists).toBe(false);
    await store.remove(result.uri);
    expect(mockFileRegistry.get(result.uri)?.exists).toBe(false);
  });

  it('deletes corrupt and interrupted partial files instead of exposing them', async () => {
    mockDownloadBytes = Array.from(new TextEncoder().encode('<html>'));
    const corrupt = createExpoPrivateScoreFileStore();
    await expect(corrupt.download({
      url: 'https://example.test/file', choirId: CHOIR, fileId: FILE_ID,
      signal: new AbortController().signal,
    })).rejects.toThrow('geçerli bir PDF değil');
    expect(Array.from(mockFileRegistry.entries()).filter(([uri]) => uri.endsWith('.part') || uri.endsWith('.pdf'))
      .every(([, entry]) => !entry.exists)).toBe(true);

    mockFileRegistry.clear();
    mockDownloadError = new Error('cancelled');
    const controller = new AbortController();
    controller.abort();
    const interrupted = createExpoPrivateScoreFileStore();
    await expect(interrupted.download({
      url: 'https://example.test/file', choirId: CHOIR, fileId: FILE_ID, signal: controller.signal,
    })).rejects.toThrow('durduruldu');
    expect(Array.from(mockFileRegistry.entries()).filter(([uri]) => uri.endsWith('.part') || uri.endsWith('.pdf'))
      .every(([, entry]) => !entry.exists)).toBe(true);
  });

  it('rejects unscoped identifiers and clears the private root on tenant cleanup', async () => {
    const store = createExpoPrivateScoreFileStore();
    await expect(store.download({
      url: 'https://example.test/file', choirId: '../other', fileId: FILE_ID,
      signal: new AbortController().signal,
    })).rejects.toThrow('kimliği geçersiz');
    await store.download({
      url: 'https://example.test/file', choirId: CHOIR, fileId: FILE_ID,
      signal: new AbortController().signal,
    });
    await store.clear();
    expect(mockRootDeleted).toBe(true);
  });

  it('removes a downloaded file whose actual size exceeds the limit', async () => {
    mockDownloadSize = 100 * 1024 * 1024 + 1;
    const store = createExpoPrivateScoreFileStore();
    await expect(store.download({
      url: 'https://example.test/file', choirId: CHOIR, fileId: FILE_ID,
      signal: new AbortController().signal,
    })).rejects.toThrow('100 MB');
    expect(Array.from(mockFileRegistry.entries()).filter(([uri]) => uri.endsWith('.part') || uri.endsWith('.pdf'))
      .every(([, entry]) => !entry.exists)).toBe(true);
  });
});

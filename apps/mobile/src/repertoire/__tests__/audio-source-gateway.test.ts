import { createNativeAudioSourceGateway } from '../audio-source-gateway';

const firstFileId = '11111111-1111-4111-8111-111111111111';
const secondFileId = '22222222-2222-4222-8222-222222222222';

describe('native audio source gateway', () => {
  it('uses the current token and repository UUID and passes a cancellation signal', async () => {
    const requestTicket = jest.fn(async () => ({ url: 'https://project.invalid/audio', expiresAt: 20_000 }));
    const gateway = createNativeAudioSourceGateway({
      endpoint: 'https://project.invalid/functions/v1/repertoire-file',
      session: { getAccessToken: jest.fn(async () => 'fresh-token') },
      requestTicket,
    });

    await expect(gateway.open(firstFileId)).resolves.toEqual({
      url: 'https://project.invalid/audio',
      expiresAt: 20_000,
    });
    expect(requestTicket).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: 'https://project.invalid/functions/v1/repertoire-file',
      accessToken: 'fresh-token',
      fileId: firstFileId,
      signal: expect.any(AbortSignal),
    }));
  });

  it('aborts and refuses an older request after a newer selection', async () => {
    let resolveFirst!: (value: { url: string; expiresAt: number }) => void;
    const signals: AbortSignal[] = [];
    const requestTicket = jest.fn(({ fileId, signal }: { fileId: string; signal?: AbortSignal }) => {
      if (signal) signals.push(signal);
      if (fileId === firstFileId) return new Promise<{ url: string; expiresAt: number }>((resolve) => {
        resolveFirst = resolve;
      });
      return Promise.resolve({ url: 'https://project.invalid/second', expiresAt: 30_000 });
    });
    const gateway = createNativeAudioSourceGateway({
      endpoint: 'https://project.invalid/functions/v1/repertoire-file',
      session: { getAccessToken: jest.fn(async () => 'token') },
      requestTicket,
    });

    const first = gateway.open(firstFileId);
    await Promise.resolve();
    const second = gateway.open(secondFileId);
    resolveFirst({ url: 'https://project.invalid/first', expiresAt: 20_000 });

    await expect(second).resolves.toMatchObject({ url: 'https://project.invalid/second' });
    await expect(first).rejects.toThrow('artık geçerli değil');
    expect(signals[0]?.aborted).toBe(true);
  });

  it('invalidates in-flight work and rejects a missing session on clear', async () => {
    let resolveToken!: (value: string | null) => void;
    const gateway = createNativeAudioSourceGateway({
      endpoint: 'https://project.invalid/functions/v1/repertoire-file',
      session: { getAccessToken: () => new Promise((resolve) => { resolveToken = resolve; }) },
      requestTicket: jest.fn(),
    });
    const pending = gateway.open(firstFileId);
    gateway.clear();
    resolveToken('late-token');
    await expect(pending).rejects.toThrow('artık geçerli değil');

    const missing = createNativeAudioSourceGateway({
      endpoint: 'https://project.invalid/functions/v1/repertoire-file',
      session: { getAccessToken: jest.fn(async () => null) },
      requestTicket: jest.fn(),
    });
    await expect(missing.open(firstFileId)).rejects.toThrow('Oturum bulunamadı');
  });
});

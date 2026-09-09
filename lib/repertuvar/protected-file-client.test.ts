import { describe, expect, it, vi } from 'vitest';
import { requestProtectedRepertoireFileTicket } from './protected-file-client';

const fileId = '11111111-1111-4111-8111-111111111111';
const endpoint = 'https://project.supabase.co/functions/v1/repertoire-file';
const ticketUrl = `${endpoint}?fileId=${fileId}&ticket=signed`;

describe('protected repertoire file client', () => {
  it('sends only the repository file ID with bearer authorization', async () => {
    const fetcher = vi.fn(async () => Response.json({ url: ticketUrl, expiresAt: 2_000 }));
    const result = await requestProtectedRepertoireFileTicket({
      endpoint,
      accessToken: 'access-token',
      fileId,
      fetcher,
      now: 1_000,
    });

    expect(result).toEqual({ url: ticketUrl, expiresAt: 2_000 });
    expect(fetcher).toHaveBeenCalledWith(new URL(endpoint), {
      method: 'POST',
      headers: { Authorization: 'Bearer access-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    });
  });

  it('resolves a proxy-safe relative ticket against the configured endpoint', async () => {
    const fetcher = vi.fn(async () => Response.json({
      url: `?fileId=${fileId}&ticket=signed`,
      expiresAt: 2_000,
    }));
    await expect(requestProtectedRepertoireFileTicket({
      endpoint,
      accessToken: 'access-token',
      fileId,
      fetcher,
      now: 1_000,
    })).resolves.toEqual({ url: ticketUrl, expiresAt: 2_000 });
  });

  it('rejects invalid local input without a request', async () => {
    const fetcher = vi.fn();
    await expect(requestProtectedRepertoireFileTicket({ endpoint, accessToken: '', fileId, fetcher }))
      .rejects.toThrow('Oturum bulunamadı');
    await expect(requestProtectedRepertoireFileTicket({ endpoint, accessToken: 'token', fileId: 'drive-id', fetcher }))
      .rejects.toThrow('Dosya kimliği geçersiz');
    await expect(requestProtectedRepertoireFileTicket({ endpoint: 'not a URL', accessToken: 'token', fileId, fetcher }))
      .rejects.toThrow('yapılandırılmamış');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('preserves a non-empty server refusal without accepting a foreign or expired URL', async () => {
    const denied = vi.fn(async () => new Response('Bu dosyaya erişim yetkiniz yok.', { status: 403 }));
    await expect(requestProtectedRepertoireFileTicket({ endpoint, accessToken: 'token', fileId, fetcher: denied }))
      .rejects.toThrow('Bu dosyaya erişim yetkiniz yok.');

    for (const payload of [
      { url: 'https://attacker.invalid/file', expiresAt: 2_000 },
      { url: 'https://project.supabase.co/other-path?fileId=11111111-1111-4111-8111-111111111111&ticket=signed', expiresAt: 2_000 },
      { url: ticketUrl, expiresAt: 1_000 },
      { url: 'not a URL', expiresAt: 2_000 },
      { url: ticketUrl, expiresAt: 'later' },
    ]) {
      const fetcher = vi.fn(async () => Response.json(payload));
      await expect(requestProtectedRepertoireFileTicket({
        endpoint, accessToken: 'token', fileId, fetcher, now: 1_000,
      })).rejects.toThrow('geçersiz yanıt');
    }
  });

  it('allows local HTTP development but rejects a remote cleartext endpoint', async () => {
    const localEndpoint = 'http://127.0.0.1:54321/functions/v1/repertoire-file';
    const fetcher = vi.fn(async () => Response.json({
      url: `${localEndpoint}?fileId=${fileId}&ticket=signed`,
      expiresAt: 2_000,
    }));
    await expect(requestProtectedRepertoireFileTicket({
      endpoint: localEndpoint, accessToken: 'token', fileId, fetcher, now: 1_000,
    })).resolves.toMatchObject({ expiresAt: 2_000 });
    await expect(requestProtectedRepertoireFileTicket({
      endpoint: 'http://project.invalid/functions/v1/repertoire-file',
      accessToken: 'token', fileId, fetcher,
    })).rejects.toThrow('yapılandırılmamış');
  });
});

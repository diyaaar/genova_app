import { describe, expect, it, vi } from 'vitest';
import { fetchStorageObject, makeStorageObjectUrl } from './storage';

describe('repertoire-file storage fetch', () => {
  it('builds the authenticated Storage object route and encodes each segment', () => {
    expect(makeStorageObjectUrl(
      'https://project.supabase.co',
      'private scores',
      'season 1/şarkı.pdf',
    )?.toString()).toBe(
      'https://project.supabase.co/storage/v1/object/private%20scores/season%201/%C5%9Fark%C4%B1.pdf',
    );
  });

  it.each([
    ['', 'score.pdf'],
    ['private', ''],
    ['private', '../score.pdf'],
    ['private', 'scores/./score.pdf'],
    ['private', 'scores//score.pdf'],
  ])('rejects an unsafe or incomplete location (%s, %s)', (bucket, path) => {
    expect(makeStorageObjectUrl('https://project.supabase.co', bucket, path)).toBeNull();
  });

  it('preserves the upstream response headers used by active-content checks', async () => {
    const info = Response.json({ content_type: 'text/html; charset=utf-8' });
    const upstream = new Response('<html/>', {
      status: 200,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    const fetcher = vi.fn()
      .mockResolvedValueOnce(info)
      .mockResolvedValueOnce(upstream);

    const response = await fetchStorageObject({
      supabaseUrl: 'https://project.supabase.co',
      serviceRoleKey: 'local-test-service-key',
      bucket: 'private',
      path: 'scores/alto.pdf',
      fetcher,
    });

    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await response.text()).toBe('<html/>');
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      new URL('https://project.supabase.co/storage/v1/object/info/private/scores/alto.pdf'),
      {
        headers: {
          Authorization: 'Bearer local-test-service-key',
          apikey: 'local-test-service-key',
        },
        redirect: 'manual',
        cache: 'no-store',
      },
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      new URL('https://project.supabase.co/storage/v1/object/private/scores/alto.pdf'),
      {
        headers: {
          Authorization: 'Bearer local-test-service-key',
          apikey: 'local-test-service-key',
        },
        redirect: 'manual',
        cache: 'no-store',
      },
    );
  });

  it('preserves an active response type when benign metadata disagrees', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ content_type: 'application/pdf' }))
      .mockResolvedValueOnce(new Response('<html/>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }));

    const response = await fetchStorageObject({
      supabaseUrl: 'https://project.supabase.co',
      serviceRoleKey: 'local-test-service-key',
      bucket: 'private',
      path: 'scores/alto.pdf',
      fetcher,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html');
    expect(await response.text()).toBe('<html/>');
  });
});

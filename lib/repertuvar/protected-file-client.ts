const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProtectedRepertoireFileTicket {
  url: string;
  expiresAt: number;
}

export async function requestProtectedRepertoireFileTicket({
  endpoint,
  accessToken,
  fileId,
  fetcher = fetch,
  now = Date.now(),
}: {
  endpoint: string;
  accessToken: string;
  fileId: string;
  fetcher?: typeof fetch;
  now?: number;
}): Promise<ProtectedRepertoireFileTicket> {
  if (!accessToken) throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  if (!UUID_PATTERN.test(fileId)) throw new Error('Dosya kimliği geçersiz.');

  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new Error('Dosya servisi yapılandırılmamış.');
  }
  const localHttp = endpointUrl.protocol === 'http:' &&
    ['127.0.0.1', 'localhost'].includes(endpointUrl.hostname);
  if (endpointUrl.protocol !== 'https:' && !localHttp) {
    throw new Error('Dosya servisi yapılandırılmamış.');
  }

  const response = await fetcher(endpointUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId }),
  });
  if (!response.ok) {
    const message = (await response.text()).trim();
    throw new Error(message || 'Dosya erişim bağlantısı oluşturulamadı.');
  }

  const payload = await response.json() as Partial<ProtectedRepertoireFileTicket>;
  if (typeof payload.url !== 'string' || typeof payload.expiresAt !== 'number') {
    throw new Error('Dosya servisi geçersiz yanıt verdi.');
  }
  let ticketUrl: URL;
  try {
    ticketUrl = new URL(payload.url, endpointUrl);
  } catch {
    throw new Error('Dosya servisi geçersiz yanıt verdi.');
  }
  if (
    ticketUrl.origin !== endpointUrl.origin ||
    ticketUrl.pathname !== endpointUrl.pathname ||
    ticketUrl.searchParams.get('fileId') !== fileId ||
    !ticketUrl.searchParams.get('ticket') ||
    payload.expiresAt <= now
  ) {
    throw new Error('Dosya servisi geçersiz yanıt verdi.');
  }
  return { url: ticketUrl.toString(), expiresAt: payload.expiresAt };
}

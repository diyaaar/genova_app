import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { once } from 'node:events';
import { Readable } from 'node:stream';

/** Deno fetch removes Content-Length from streamed bodies. The Node-compatible HTTP transport
 * preserves S3's exact length while applying backpressure; signing and target validation happen
 * before this boundary. It never follows redirects or retries a partially consumed stream.
 */
export async function sendSignedUpload(signed: Request): Promise<Response> {
  if (signed.method !== 'PUT' || !signed.body || !signed.headers.has('content-length')) {
    throw new Error('Invalid signed upload');
  }
  const reader = signed.body.getReader();
  return new Promise<Response>((resolve, reject) => {
    const send = new URL(signed.url).protocol === 'https:' ? httpsRequest : httpRequest;
    const outgoing = send(signed.url, {
      method: 'PUT', headers: Object.fromEntries(signed.headers), signal: signed.signal,
    }, (incoming) => {
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
      }
      const status = incoming.statusCode ?? 502;
      const body = Readable.toWeb(incoming) as ReadableStream<Uint8Array>;
      if (status === 204 || status === 304) {
        incoming.resume();
        resolve(new Response(null, { status, headers }));
      } else resolve(new Response(body, { status, headers }));
    });
    outgoing.on('error', (error) => {
      void reader.cancel().catch(() => undefined);
      reject(error);
    });
    void (async () => {
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          if (!outgoing.write(next.value)) await once(outgoing, 'drain');
        }
        outgoing.end();
      } catch (error) {
        outgoing.destroy(error instanceof Error ? error : new Error('Upload stream failed'));
      }
    })();
  });
}

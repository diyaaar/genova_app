import { createHash } from 'node:crypto';

export class UploadError extends Error {
  constructor(public readonly code: string, public readonly status = 400) { super(code); }
}

function hasMediaSignature(prefix: Uint8Array, mime: string) {
  const text = new TextDecoder('latin1').decode(prefix);
  if (mime === 'application/pdf') return text.startsWith('%PDF-');
  if (mime === 'audio/wav' || mime === 'audio/x-wav') return text.startsWith('RIFF') && text.slice(8, 12) === 'WAVE';
  if (mime === 'audio/mpeg') return text.startsWith('ID3') || (prefix[0] === 255 && (prefix[1] & 0xe0) === 0xe0);
  if (mime === 'audio/aac') return prefix[0] === 255 && (prefix[1] & 0xf6) === 0xf0;
  if (mime === 'audio/mp4') return text.slice(4, 8) === 'ftyp';
  if (mime === 'audio/ogg') return text.startsWith('OggS');
  if (mime === 'audio/flac') return text.startsWith('fLaC');
  if (mime === 'audio/webm') return [0x1a, 0x45, 0xdf, 0xa3].every((v, i) => prefix[i] === v);
  if (mime === 'image/jpeg') return prefix[0] === 0xff && prefix[1] === 0xd8 && prefix[2] === 0xff;
  if (mime === 'image/png') return [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v,i)=>prefix[i]===v);
  if (mime === 'image/webp') return text.startsWith('RIFF') && text.slice(8,12) === 'WEBP';
  if (mime === 'image/gif') return text.startsWith('GIF87a') || text.startsWith('GIF89a');
  if (mime === 'image/bmp') return text.startsWith('BM');
  if (mime === 'image/avif') return text.slice(4,8) === 'ftyp' && /(?:avif|avis)/.test(text.slice(8,64));
  return false;
}

/** Constant-memory byte/hash verification. This validates media headers, not a malware scan. */
export function verifiedStream(body: ReadableStream<Uint8Array>, expected: {
  size: number; sha256?: string; mimeType: string;
}) {
  const reader = body.getReader();
  const hash = createHash('sha256');
  const prefix = new Uint8Array(64);
  let prefixLength = 0;
  let size = 0;
  let finished = false;
  let actualSha256: string | null = null;
  let failure: unknown;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) {
          if (size !== expected.size) throw new UploadError('size-mismatch');
          if (!hasMediaSignature(prefix.subarray(0, prefixLength), expected.mimeType)) throw new UploadError('invalid-media', 415);
          actualSha256 = hash.digest('hex');
          if (expected.sha256 && actualSha256 !== expected.sha256) throw new UploadError('hash-mismatch');
          finished = true;
          controller.close();
          return;
        }
        size += next.value.byteLength;
        if (size > expected.size) throw new UploadError('size-exceeded', 413);
        const take = Math.min(prefix.length - prefixLength, next.value.length);
        prefix.set(next.value.subarray(0, take), prefixLength);
        prefixLength += take;
        hash.update(next.value);
        controller.enqueue(next.value);
      } catch (error) {
        failure = error;
        await reader.cancel().catch(() => undefined);
        controller.error(error);
      }
    },
    async cancel(reason) { await reader.cancel(reason); },
  });
  return {
    stream,
    assertFinished() {
      if (failure) throw failure;
      if (!finished || !actualSha256) throw new UploadError('incomplete-stream', 502);
      return actualSha256;
    },
    async cancel() { await reader.cancel().catch(() => undefined); },
  };
}

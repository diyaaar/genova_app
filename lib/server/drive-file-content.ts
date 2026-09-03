const ACTIVE_CONTENT_MIME_TYPES = new Set([
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

const ACTIVE_CONTENT_FILE_EXTENSION_PATTERN = /\.(?:html?|xhtml?|svgz?|xml|xsl|xslt|js|mjs)$/i;

export function normalizeMimeType(mimeType: string | null | undefined) {
  return mimeType?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

export function isActiveContentMimeType(mimeType: string | null | undefined) {
  const normalizedMimeType = normalizeMimeType(mimeType);
  return (
    ACTIVE_CONTENT_MIME_TYPES.has(normalizedMimeType) ||
    normalizedMimeType.endsWith('+xml')
  );
}

export function hasActiveContentFileExtension(fileName: string | null | undefined) {
  if (!fileName) {
    return false;
  }

  const nameWithoutQueryOrFragment = fileName.split(/[?#]/, 1)[0]?.trim() ?? '';
  return ACTIVE_CONTENT_FILE_EXTENSION_PATTERN.test(nameWithoutQueryOrFragment);
}

export function isActiveDriveFileContent(params: {
  mimeType?: string | null;
  fileName?: string | null;
}) {
  return isActiveContentMimeType(params.mimeType) || hasActiveContentFileExtension(params.fileName);
}

export function makeActiveContentRejectedResponse() {
  return new Response('Aktif web içeriği türündeki dosyalar desteklenmiyor.', {
    status: 415,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

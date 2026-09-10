import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const PRODUCT_ROOTS = ['app', 'components', 'hooks', 'lib'];
const BROWSER_AUTH_OWNERS = new Set([
  'app/auth/recovery/page.tsx',
  'app/invite/page.tsx',
  'app/(main)/profil/duzenle/page.tsx',
  'components/AuthProvider.tsx',
  'lib/supabase.ts',
  'lib/web-auth-capability.ts',
]);
const BEARER_HEADER_OWNERS = new Set([
  'lib/repertuvar/protected-file-client.ts',
  'lib/web-auth-capability.ts',
]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    if (entry.startsWith('.') || entry === 'node_modules') return [];
    if (statSync(absolute).isDirectory()) return sourceFiles(absolute);
    return /\.(?:ts|tsx)$/u.test(entry) && !/\.test\.(?:ts|tsx)$/u.test(entry) ? [absolute] : [];
  });
}

describe('web auth call-site contract', () => {
  it('routes every product bearer read through the environment-neutral capability', () => {
    const violations = PRODUCT_ROOTS
      .flatMap((directory) => sourceFiles(path.join(ROOT, directory)))
      .filter((file) => /\bsupabase\.auth\.getSession\s*\(/u.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file));

    expect(violations).toEqual([]);
  });

  it('keeps browser Auth commands in the explicit allowlisted owners', () => {
    const violations = PRODUCT_ROOTS
      .flatMap((directory) => sourceFiles(path.join(ROOT, directory)))
      .flatMap((file) => {
        const relative = path.relative(ROOT, file);
        const source = readFileSync(file, 'utf8');
        return /\bbrowserSupabase\.auth\./u.test(source) && !BROWSER_AUTH_OWNERS.has(relative) ? [relative] : [];
      });

    expect(violations).toEqual([]);
  });

  it('does not create an embedded credential sink in URL or Web Storage', () => {
    const sources = [
      'components/EmbeddedWebBridgeProvider.tsx',
      'lib/embedded-web-runtime.ts',
      'lib/supabase.ts',
    ].map((file) => readFileSync(path.join(ROOT, file), 'utf8')).join('\n');

    expect(sources).not.toMatch(/(?:localStorage|sessionStorage)\.setItem\s*\([^)]*(?:accessToken|refreshToken)/u);
    expect(sources).not.toMatch(/(?:searchParams|URLSearchParams)\.set\s*\([^)]*(?:accessToken|refreshToken)/u);
    expect(sources).not.toMatch(/console\.(?:log|info|warn|error)\s*\([^)]*(?:accessToken|refreshToken)/u);
    expect(sources).not.toContain('refresh_token');
  });

  it('centralizes client bearer headers so embedded mutation freeze and 401 renewal cannot be bypassed', () => {
    const violations = PRODUCT_ROOTS
      .flatMap((directory) => sourceFiles(path.join(ROOT, directory)))
      .flatMap((file) => {
        const relative = path.relative(ROOT, file);
        const isServer = relative.startsWith('app/api/') || relative.startsWith('lib/server/');
        const source = readFileSync(file, 'utf8');
        return /Authorization\s*:\s*`Bearer\s+\$\{/u.test(source)
          && !isServer && !BEARER_HEADER_OWNERS.has(relative) ? [relative] : [];
      });

    expect(violations).toEqual([]);
  });
});

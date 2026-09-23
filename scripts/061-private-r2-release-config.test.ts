import { existsSync, readFileSync, readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const configuredFunctions = [
  'repertoire-file',
  'repertoire-upload',
  'repertoire-file-lifecycle',
  'assignment-file',
  'assignment-upload',
  'assignment-review-file',
  'assignment-review-upload',
  'repertoire-comment-file',
  'repertoire-comment-upload',
  'repertoire-comment-lifecycle',
  'chat-media-file',
  'chat-media-upload',
  'chat-media-lifecycle',
] as const;

const migrations = [
  '20260920205054_private_r2_repertoire_read_053.sql',
  '20260921185113_private_r2_repertoire_upload_054.sql',
  '20260922071942_private_r2_repertoire_lifecycle_055.sql',
  '20260922171847_private_r2_repertoire_cover_056.sql',
  '20260922221500_private_r2_assignment_versions_057.sql',
  '20260923103000_private_r2_assignment_review_audio_058.sql',
  '20260923170000_private_r2_repertoire_comment_audio_059.sql',
  '20260923193000_private_r2_chat_media_060.sql',
] as const;

const rollbacks = [
  '060_private_r2_chat_media_down.sql',
  '059_private_r2_repertoire_comment_audio_down.sql',
  '058_private_r2_assignment_review_audio_down.sql',
  '057_private_r2_assignment_versions_down.sql',
  '056_private_r2_repertoire_cover_down.sql',
  '055_private_r2_repertoire_lifecycle_down.sql',
  '054_private_r2_repertoire_upload_down.sql',
  '053_private_r2_repertoire_read_down.sql',
] as const;

function section(config: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\[functions\\.${escaped}\\]([\\s\\S]*?)(?=\\n\\[|$)`, 'u').exec(config)?.[1];
}

describe('061 private R2 release configuration', () => {
  const config = readFileSync('supabase/config.toml', 'utf8');

  it('declares handler-owned authentication for every outgoing R2 function', () => {
    const discovered = readdirSync('supabase/functions', { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(`supabase/functions/${entry.name}/index.ts`))
      .filter((entry) => /R2_|STORAGE_MODE|chat_media_|assignment_file_versions|repertoire_file_storage_locations/u
        .test(readFileSync(`supabase/functions/${entry.name}/index.ts`, 'utf8')))
      .map((entry) => entry.name)
      .sort();
    expect(discovered).toEqual([...configuredFunctions].sort());
    for (const name of configuredFunctions) {
      expect(existsSync(`supabase/functions/${name}/index.ts`), name).toBe(true);
      expect(section(config, name), name).toMatch(/\bverify_jwt\s*=\s*false\b/u);
    }
  });

  it('keeps the ordered forward and reverse schema chain explicit', () => {
    for (const migration of migrations) {
      expect(existsSync(`supabase/migrations/${migration}`), migration).toBe(true);
    }
    for (const rollback of rollbacks) {
      expect(existsSync(`supabase/rollback/${rollback}`), rollback).toBe(true);
    }
  });

  it('does not enable local provider overrides in production config', () => {
    expect(config).not.toMatch(/R2_TEST_ENDPOINT|R2_ALLOW_INSECURE_LOOPBACK/u);
  });
});

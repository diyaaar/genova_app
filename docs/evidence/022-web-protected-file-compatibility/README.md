# 022 web protected-file compatibility evidence

Captured and self-reviewed on 2026-09-09 from code/test commit `fb4a6a2`. A production Next build
and installed Google Chrome exercised the existing web product against one guarded, disposable
local Supabase stack and a synthetic two-choir account. No hosted project, Drive provider, real
account, remote CI, push, deployment or hardware was used.

## Frozen runtime and fixture

- The runner accepted only project `genova-022-runtime`, Docker context `colima-genova022`, the
  loopback API on port 54321, the local PostgreSQL 17 source copy `genova_008_test_restore` and a
  `supabase-demo` service-role JWT. Browser code received only the local anon key and ephemeral
  synthetic credentials from ignored mode-0600 files.
- Supabase CLI 2.117.0 ran actual local Auth, PostgREST/RLS, private Storage and the
  `repertoire-file` Edge entrypoint. Other observed tools were Colima 0.10.3, Deno 2.9.6,
  Node 24.13.1, pnpm 11.9.0, Playwright 1.62.1 and installed Chrome 152.0.7977.83. The target DB
  guard verified PostgreSQL major 17; no unobserved component patch version is inferred.
- One ephemeral `example.invalid` user had memberships in two synthetic choirs. Choir A contained
  one assigned repertoire item, two protected files and three annotation rows; choir B was empty.
- The PDF was 40 pages and 65,905 bytes, SHA-256
  `39fcafaec0263d8c2429a66d4ea941180692a99749be398a1d48c8fd5397d6a3`. The deterministic
  10-second mono WAV was 160,044 bytes, SHA-256
  `b43dde9816f8047e0c351a5a756f99d75433396ce8f4ac0b36dc1d825f26127e`.

## Product-browser result

The final run used the real login, choir selection, repertoire page, PDF viewer, shared audio
player, protected-file ticket route, service worker and Cache Storage:

1. Choir A exposed the assigned score. The viewer rendered the tracked PDF and audio playback
   reached the Edge route with a successful HTTP 206 Range response.
2. A deliberately near-expiry first PDF ticket was replaced; the final run observed four
   successful PDF ticket POSTs across navigation and retry.
3. The explicit offline switch stored two file entries, one song metadata entry and two transient
   runtime entries. `/offline-drive/` returned the exact PDF and WAV sizes and checksums above.
4. The fixture changed the existing audio row to a missing private Storage object. Re-enabling
   offline exposed the bounded product message `022-korunan-440hz.wav indirilemedi (502)`; the
   original link was restored before continuing.
5. Switching to choir B removed all four protected cache namespaces and the old audio player.
   Choir B showed an empty catalogue; a direct authenticated request for A's PDF returned 403 and
   disclosed no `storage://` locator.
6. Product sign-out returned to the login UI and left no protected cache namespace, auth token,
   active-choir preference, offline preference or audio player control.

The machine-readable [browser summary](browser-summary.json) contains only sanitized counts,
checksums and limits. Page errors were empty. Runtime ticket URLs, JWTs, credentials and Storage
locators were not written to tracked evidence.

## Visual evidence

| Capture | SHA-256 | Observed result |
|---|---|---|
| [web-pdf-audio-offline.png](web-pdf-audio-offline.png) | `89a4278d1e22cfdce0cdbf99268815abc95f6bb4cd91d8d6b9467e8936ee91b5` | Actual page 1/40 and annotation overlay rendered; the explicit offline status reports two files ready and the audio control is present. |
| [web-failed-download.png](web-failed-download.png) | `9797dd1c0b6609e6980fa572979c83242fc92ec2a73f227729ba4f6a1847e63d` | The same product view shows the bounded 502 audio-download failure after the upstream object was made missing. |
| [web-choir-b-clean.png](web-choir-b-clean.png) | `8617518a1e24700f7024c86096d5be1164e10d5699c7691de79131cc57c83452` | The selected B choir has an empty repertoire after protected cache/audio teardown. |
| [web-signout-clean.png](web-signout-clean.png) | `e836777d20a4828a09eb38820e7b15996be7268eaf9a677b3559d303cdb67bd0` | The normal login UI is visible after product sign-out. Storage/cache emptiness was asserted in the same browser step. |

## Gates, failures and cleanup

- Root `pnpm check` passed: lint, TypeScript, 38 test files / 253 tests, service-worker syntax and
  production Next build. A second production build with the guarded 022 public loopback variables
  passed before the final browser run; public Next variables are compiled into the bundle.
- The first global Supabase CLI 2.107.0 attempt produced an incomplete current Storage schema, so
  no acceptance was claimed. The disposable stack was rebuilt with CLI 2.117.0.
- Early browser iterations exposed acceptance-runner defects: playback needed the product's
  explicit play control, transient runtime cache had to be deleted to observe ticket renewal, the
  failure fixture had to break an existing visible file, and profile sign-out required opening its
  menu. A later rerun also showed that repeated logins may begin in choir B and that a root rebuild
  replaces compiled public environment values. The final runner handles existing choir selection;
  the documented final order is root gate, guarded 022 build, server start, browser acceptance.
- Final `status` re-downloaded both objects and reproduced their checksums. `cleanup` restored the
  tracked target-table baseline, removed the synthetic Auth user, rows, bucket and objects, and
  confirmed the source database snapshot was unchanged. The Next server and stack were stopped.
- Colima deletion left its task-owned 20 GB sparse VM disk behind. After confirming the profile was
  stopped/deleted and the disk had no open process, that reproducible disk alone was permanently
  unlinked. The secret-free runtime directory and 89-byte profile record were moved to
  `~/.Trash/genova-022-cleanup-20260909-2225`; host free space increased from about 5.5 GB to 10 GB.
- This closes only local/synthetic A3. Deployment, hosted routing, Drive, real accounts/data,
  remote CI, physical hardware, performance, offline authorization revocation and independent
  review remain unverified. Package 004 remains 25/27 and 010 remains 6/7.

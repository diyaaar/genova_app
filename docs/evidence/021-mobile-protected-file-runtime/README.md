# 021 mobile protected-file runtime evidence

Captured and self-reviewed on 2026-09-09 from code/test commit `404a9ee`. The same guarded,
disposable local Supabase service and synthetic two-choir fixture drove an iPhone 17 / iOS 26.5
simulator and the `genova004_api36` Android 16 / API 36 arm64 emulator. No hosted project,
Drive provider, real account, physical device, remote CI, push or deployment was used.

## Frozen runtime and fixture

- Actual local Auth, PostgREST/RLS, private Storage and the `repertoire-file` Edge entrypoint ran
  under project `genova-021-runtime` at loopback port 54321. The guarded runner accepted only the
  dedicated local PostgreSQL 17 source copy `genova_008_test_restore`, Colima/Docker context
  `colima-genova021`, `supabase-demo` service-role JWTs and its exact task workdir.
- One ephemeral `example.invalid` user had memberships in two synthetic choirs. Choir A had one
  assigned score and three annotation rows; choir B had none. Secrets existed only in mode-0600,
  ignored runtime files and were removed before the runtime was moved to Trash.
- The private object was a 40-page, 65,905-byte PDF with SHA-256
  `39fcafaec0263d8c2429a66d4ea941180692a99749be398a1d48c8fd5397d6a3`.
  A final status run re-downloaded the Storage object and reproduced that size and checksum.
- Tools observed for this run: Supabase CLI 2.107.0, Colima 0.10.3, Docker client 29.8.0 /
  server 29.5.2, Deno 2.9.6, Node 24.13.1, pnpm 11.9.0 and Xcode 26.6.

## Runtime path and acceptance result

Both Release applications used the real default Supabase mobile client, `AuthProvider`,
`list_my_choirs` / `set_active_choir`, native catalogue source, shared ticket client, private Expo
file store, native PDF-page-image renderer, Skia overlay and application cache cleaners. The
alternate entry changed only orchestration and sanitized status reporting.

On each platform the observed sequence was:

1. Real local Auth signed in the ephemeral user and exposed exactly two memberships.
2. Choir A selection returned its one assigned score through the real catalogue/RLS path.
3. The first open sent an intentionally invalid user bearer token to the actual Edge endpoint,
   received its `401 Oturum geçersiz` refusal and exposed the reader retry action.
4. Retry used the current session, obtained a fresh signed ticket, downloaded exactly 65,905
   bytes and rendered page 1 of 40 with the expected PDF pixels and Skia annotations.
5. Reader exit reported the active private PDF absent; reopening obtained another fresh ticket
   and rendered page 1 again. On iOS the simulator cache was also inspected directly and the
   protected-score directory was absent after sign-out. Android Release correctly refused
   `run-as`, so its private directory was not inspected outside the app; the in-app `File.exists`
   probe is the Android removal evidence.
6. Switching to choir B cleared tenant caches before selection. A new ticket request for choir
   A's file was refused with 403, and choir B's real catalogue was empty.
7. Sign-out returned to the login UI. Explicit reads then reported both the native preference and
   Supabase session empty; protected-score cleanup had already passed.

The final runtime status reported two memberships, three annotations, the exact object checksum
and an unchanged source database. Cleanup restored the tracked target-table baseline, removed the
synthetic Auth user and private bucket/object, preserved the source hash, removed Android's
temporary `adb reverse tcp:54321` route, stopped the stack and emulator, requested deletion of the
task-owned Colima profile, and moved the secret-free runtime directory to Trash. A later resource
audit on 18 September found that Colima had left its non-running `colima-genova021` data disk and
store marker behind despite the original cleanup result. There was no instance, Docker context,
process or relevant listener. The supported `colima delete genova021 --data --force` removed only
that exact 5,565,904 KiB generated residue and its marker; absence was verified. Available space
rose from 18,339,680 to 23,915,364 KiB. This correction does not change the product/runtime result.

## Visual evidence

| Capture | SHA-256 | Observed result |
|---|---|---|
| [ios-failed-missing-public-env.png](ios-failed-missing-public-env.png) | `60f1815695ea47750fe09891e5e469476c67d46fa51d8054ae9263f328837e78` | First iOS Release build opened blank because indirect Expo public-environment access was not replaced. Preserved failure evidence, not acceptance. |
| [ios-memberships.png](ios-memberships.png) | `82584a124d071e4a2ab84aa4822dd541af0a84c7a4eefa83dd9c74af626fbf9b` | After direct public-variable access, the real local Auth/RPC path exposes the two synthetic memberships. |
| [ios-page-1.png](ios-page-1.png) | `1cc9f0501a24a00bb8ae47515f0f6edb10377639477454723f7013035194b277` | Banner records real first refusal, fresh ticket and 65,905-byte download; actual page 1/40 and annotations are visibly rendered. |
| [ios-choir-b-empty.png](ios-choir-b-empty.png) | `118359bdff9033faa3222d81e6f05d600854d8b2f4ed2a733bd974e81b6ceb47` | Tenant cleanup and actual 403 passed; the real B catalogue contains no A score. |
| [ios-signout-clean.png](ios-signout-clean.png) | `125336d2440b07db214ce9d54ccd898f6eaad4ee22efd33990e53bb158c1cb52` | Signed-out UI plus explicit empty native preference and Supabase session. |
| [android-first-refusal.png](android-first-refusal.png) | `9edc7c4fad80cc30224570b8a2813b67fc2acc0e9dc39d39bc680de6f1f351ca` | Actual Android reader shows the service's `Oturum geçersiz` response and retry control. |
| [android-page-1.png](android-page-1.png) | `de1d4498e08d82f16086bba54577394916a51026482582ab9f25a692a3b8af0e` | API 36 Release shows the fresh-ticket and 65,905-byte trace with actual page 1/40 and aligned overlay. |
| [android-choir-b-empty.png](android-choir-b-empty.png) | `6798d1e48bfc9b2e1f138fba7780742b85ffafa7293be8b4cf831028de20c7ca` | Reader removal, tenant cleanup and actual 403 passed; the B catalogue is visibly empty. |
| [android-signout-clean.png](android-signout-clean.png) | `56e4790848d96cd6c5d8aafc7ab98cce695f37970ab197a3f322610380651bcb` | Login UI plus explicit empty native preference and Supabase session after sign-out. |

## Gates, failures and limits

- Mobile TypeScript/Jest passed 16 suites / 84 tests. Normal `index.ts` exports passed with
  1,314 iOS modules and 1,312 Android modules. Both affected alternate-entry Release builds
  compiled, installed and launched; no fatal/crash marker appeared in the bounded platform logs.
- The first fixture preparation failed because schema triggers had already created catalogue
  cache-version rows. The disposable target was cleaned, fixture setup changed to a keyed upsert,
  and the final prepare/status/cleanup cycle passed with both baselines checked.
- iOS exposed two product defects: Expo could not statically replace indirect public-environment
  lookup, and Expo SecureStore rejects the web preference key's colon. Direct public-variable
  access and a mobile-only dot-encoded key fixed them; the web localStorage key is unchanged.
- The first Android Release launch was correctly blocked by cleartext policy. A config plugin now
  generates a 021-only network-security resource for `127.0.0.1`/`localhost` after exact flag,
  scheme and port guards. Both clean and non-clean ordinary prebuilds were verified to remove the
  resource and contain no cleartext opt-in.
- Root `pnpm check` was N/A: 021 changed only the mobile workspace and local Supabase test support,
  not root/shared product code. The previously recorded 10 moderate Expo toolchain audit findings
  were not reclassified or claimed fixed.
- This closes only local/synthetic A2. It does not close M1, 004's two hardware rows, 010's live
  product-negative row, deployment, Drive, hosted routing, real accounts, device durability,
  remote CI, performance or independent review.

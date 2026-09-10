# Teknik bağlam

4 Eylül 2026 yerel dosya kontrolü. Kesin bağımlılık çözümü lockfile'dadır;
bu özet otomatik sürüm yükseltme talimatı değildir.

- Web: Next.js 15, React 19, TypeScript, Tailwind 4, Capacitor 8.
- Mobil hedef: React Native + Expo, ortak TS/Supabase istemcisi, Skia.
  Product workspace: `apps/mobile/` (Expo SDK 57, separate npm lockfile), implemented
  6 September. Native type/test/bundle gate directly verified on macOS on 7 September;
  [004](../docs/briefs/004-rn-kabuk-ve-giris.md) remains pending device/live acceptance.
  Flutter spike yalnız tarihsel referanstır; ürün yolu değildir.
- Backend: Supabase Auth/Postgres/RLS/Realtime/Storage/Edge Functions; AI: Gemini.
- Çalışma ortamı: [package.json](../package.json) Node `>=22.12 <25`, pnpm `11.9.0`.

## Doğrulama komutları

| Katman | Komut ve sınır |
|---|---|
| Salt belge | Bağlantı/tutarlılık incelemesi ve `git diff --check`; ürün testleri tekrar koşulmaz |
| Web kalite kapısı | Kökten `pnpm check`: lint, typecheck, kapsamlı birim test çalıştırması, service worker sözdizimi, build |
| Tarayıcı | Kökten `pnpm test:e2e`; testlerin gerçek üyeli akışı kapsayıp kapsamadığını ayrıca belirt |
| RN product | In `apps/mobile`: `npx tsc --noEmit && npm test && npm run bundle:check`; actual platform builds and hardware acceptance remain separate |
| DB / Edge | İlgili brief'in ortamı ve yetkisi doğrulanmış kontrolleri; web testi bunların yerine geçmez. 012 için yerel izole kapı: `PGDATABASE=<dedicated-test-copy> bash supabase/test-support/012_regression_runner.sh` |
| 018 local Edge runtime | Explicit task workdir/context/test-copy variables with `supabase/test-support/018_repertoire_file_runtime_runner.sh`; refuses nonlocal/non-test targets, copies schema only and restores fixtures |
| 021 mobile service lifecycle | `supabase/test-support/021_mobile_runtime_runner.sh` retains guarded fixtures through two platform runs, then proves target/source cleanup. Android loopback cleartext is generated only with the exact 021 flag and URL; ordinary prebuild removes it |
| 022 web protected-file lifecycle | `supabase/test-support/022_web_runtime_runner.sh` retains guarded PDF/audio fixtures for a production browser run; `022_web_browser_acceptance.ts` verifies real Service Worker/Cache Storage, ticket renewal, Range audio, failure, tenant switch and sign-out before explicit cleanup |
| 026 native foreground audio | In `apps/mobile`, run type/Jest/iOS export/Expo Doctor and the brief's guarded alternate-entry Release builds. `audio-server.mjs` refuses use without the exact acceptance flag and loopback URL; it serves deterministic WAV/corrupt bytes only. Simulator/emulator decode is not hardware or provider evidence |
| 027 native shell audio | Reuse 026's guarded alternate entry/server, but navigate shell → repertoire → full → repertoire/home mini → full and prove no navigation ticket. Inspect compact loading/error/disabled/clear states, exact Release apps and accessibility trees. This remains foreground simulator/emulator evidence |
| 028 WebView inventory | Documentation only: source-route/action coverage, current primary WebView/Supabase API comparison, installed-client construction probe, local links/consistency and `git diff --check`. No package, browser, WebView or provider runtime |
| 029 WebView pure policy | Root `pnpm check` plus mobile `npx tsc --noEmit && npm test -- --runInBand`; focused `lib/mobile-webview-bridge.test.ts` covers exact route/message/replay/redaction vectors. No WebView/browser/provider/runtime claim |

Kapsama oranı sadece yapılandırmadaki seçili dosyaları ölçer; tüm ürün oranı değildir.
Komut bulunmuyor veya ortam eksikse geçti yazma. [CI](../.github/workflows/ci.yml)
tanımı ile gerçekten tamamlanmış CI çalışması da ayrı kanıtlardır.

## Ortam güvenliği

Supabase işlemleri yalnız `supabase-genesinova` / `hievmwwctjjlhmssoxsu`;
doğru araç yoksa başka hesaba geçme. Kimlikler ve SSH aliası [AGENTS.md](../AGENTS.md)'de.
Sır, token, yedek içeriği, kullanıcı verisi hafızaya veya devir metnine yazılmaz.
Railway hazırlığı production bağlantısı değildir. Var olan bucket'ı içermeyen IaC
grafiğini olduğu gibi uygulama; [altyapı kaydındaki](../docs/altyapi-2026-09-04.md)
sürüm/veri/hesap sınırlarını işlem öncesinde yeniden kontrol et.

## Verified local Android environment — 7 September 2026

Existing Homebrew Java 17 and SDK at `/opt/homebrew/share/android-commandlinetools`
were reused; Android Studio was not required by the verified command-line build.
Task-created emulator/API 36 ARM64 image and AVD `genova004_api36` remain reusable.
Exact environment variables, commands, Metro IPv6 fix, partition-size override, APK hash
and screenshots belong to the [Android evidence](../docs/briefs/004-android-build-2026-09-07.md).
Generated `apps/mobile/android/` is ignored; never hand-edit or commit generated files.
Metro/emulator were stopped after acceptance, and absence was checked for handoff.
Keep macOS dependencies intact; do not install Linux binaries into its shared node_modules.
Hardware remains deferred; current acceptance status and next task are in
[activeContext](activeContext.md) and [004](../docs/briefs/004-rn-kabuk-ve-giris.md).

## Where each gate can actually be evaluated — 8 September 2026

Measured across the 8 September agent environments, not assumed. Host capabilities differ;
verify the receiving shell before use and never record an unevaluated gate as passed.

| Gate | Observed agent-shell availability | Where it was run |
|---|---|---|
| `pnpm lint`, `typecheck`, `test:coverage`, `test:service-worker` | **Linux: yes** | A copy of the repository **outside** the connected folder, with its own `pnpm install --frozen-lockfile` and CI's synthetic Supabase environment. 33 files / 206 tests |
| `pnpm build` | **macOS desktop: yes; earlier Linux agents: no** | Passed in this macOS task for 014, 015 and 016. Earlier Linux proxies refused Google Fonts; do not transfer either result to another environment without rerunning |
| `pnpm test:e2e` | **Linux: no** | Playwright's browser download is refused as well. CI only |
| SQL test files | **macOS desktop task: yes, local isolated copy only** | On 8 September the owner's macOS exposed Homebrew PostgreSQL 17.11 at `127.0.0.1:5432`; 012 ran on `genova_008_test_restore`. This does not grant or prove production access. The runner refuses non-local/non-test-named targets |

Never run an install against `apps/mobile/node_modules` or the root `node_modules` from a Linux
shell — both are macOS installs reached through the connected folder, and reinstalling
invalidates the owner's working setup. Copy the tree out first, as above.

The 9 September 018 environment added task-local Colima/Docker and host Deno tooling, then ran
Edge Runtime `1.74.1`, GoTrue `2.190.0`, PostgREST `14.13`, Storage API `1.60.20`, Kong `2.8.1`
and Supabase PostgreSQL `17.6.1.136` with synthetic data only. The reusable runner accepts only
the loopback API URL and local `supabase-demo` JWT issuer. Colima's host SSH port forwarding was
observed on a wildcard listener, so this is disposable local evidence, not a hardened shared
environment. Exact versions, command, failures and cleanup evidence are in [018](../docs/briefs/018-protected-file-runtime-acceptance.md).

Package 021 reused that disposable topology with Supabase CLI 2.107.0, Colima 0.10.3, Docker
29.8.0/29.5.2 and Deno 2.9.6. Both platform Release paths passed before the fixture, reverse route,
stack, emulator and task Colima profile were removed. Exact versions and local-only limits are in
[021 evidence](../docs/evidence/021-mobile-protected-file-runtime/README.md).

Package 022 used Supabase CLI 2.117.0, Colima 0.10.3, Deno 2.9.6, Playwright 1.62.1 and installed
Chrome 152.0.7977.83. Run the root gate before the 022-specific production build because Next
public environment values are compiled into the browser bundle. The final fixture/source cleanup
passed; exact checksums, browser evidence and local-only limits are in
[022 evidence](../docs/evidence/022-web-protected-file-compatibility/README.md).

When a CI job fails, the log storage host is unreachable from the agent shells, but the GitHub
API's **check-run annotations** endpoint returns Playwright's failure text, including the
locator and the received value. That is how three CI failures were diagnosed on 8 September.

## Native PDF dependency state — 8 September 2026

Package 016 added PDF-page-image 2.0.0, Skia 2.6.2, Expo FileSystem, Reanimated 4.5.1 and
Worklets 0.10.1. Expo Doctor passed 21/21 and the iOS simulator native build compiled those
modules. `npm audit --omit=dev` remains FAIL with 10 moderate Expo CLI/config to xcode to uuid
findings; its complete automatic fix proposes a breaking Expo 46 downgrade and was not applied.
This is a dependency-maintenance risk, not proof of an exploitable product path.

Package 017 added no dependency, build setting or native source. Its isolated acceptance and full
mobile gate passed 14 suites / 73 tests plus the 1,314-module iOS bundle. Root build, Expo Doctor
and native simulator build were correctly left N/A for 017 rather than relabeling 016 evidence.

## Native foreground audio dependency state — 10 September 2026

Package 026 added Expo SDK 57-compatible `expo-audio ~57.0.4` and aligned Expo to `~57.0.21`.
The plugin explicitly disables microphone permission, Android recording, background recording and
background playback. `useAudioPlayer(source)` owns and releases the native object when the source
identity changes; do not revive the old source with an empty `replace` call. Protected ticket
requests accept AbortSignal, keep URLs only in component state and clear them through the existing
tenant-cache boundary. Local acceptance passed mobile 20 suites / 100 tests, a 1,328-module iOS
export, Expo Doctor 21/21, iOS arm64-simulator and Android API 36 arm64 Release builds, plus root
42 files / 279 tests and Next build. Exact runtime evidence and limitations are in
[026](../docs/briefs/026-native-repertoire-audio-playback.md).

Package 027 adds no dependency or background capability. It moves the sole Expo Audio hook beneath
authenticated `ReadyShell` and projects it through full and compact views. Local acceptance passed
mobile 21 suites / 104 tests, a 1,330-module normal iOS export, Expo Doctor 21/21 and exact iOS
arm64-simulator plus Android API 36 arm64 Release builds. The loopback server returned the same
160,044-byte WAV through iOS 206 Range and Android 200; navigation retained 0:10 and 1.25x without
a new ticket, while tenant clear removed the compact surface. Exact visual evidence and limitations
are in [027 evidence](../docs/evidence/027-native-audio-shell-mini-player/README.md).

## Permanent WebView contract state — 10 September 2026

Package 028 adds no product dependency. The current mobile app has no direct
`react-native-webview`; web Supabase is 2.112.4 and native is 2.115.0. Both installed clients expose
an `accessToken` provider and Realtime token update, but that mode intentionally disables the Auth
namespace. The accepted [contract](../docs/webview-bridge-contract.md) therefore keeps refresh token
and refresh ownership in native SecureStore, gives embedded web only a challenged in-memory access
lease, and routes sign-out/theme/password capabilities through native ownership. WebView package,
CSP, embedded browser behavior, platform files/back/accessibility, hosted origin and hardware are all
NOT RUN. Package 029 accepted the framework-free policy at `4289da4`: 107 focused Vitest cases, full
root 43 files / 386 tests and Next build, plus mobile 22 suites / 105 tests and typecheck passed. The
mobile test imports the exact root module through `@shared`; it is not a native callback or WebView
runtime. Package 030 next adds the dormant web adapter and locked-before-proof seams.

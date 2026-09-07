# 004 — RN ürün kurulumu, giriş ve koro seçimi

**Status:** Local implementation exists; partial/pending acceptance. Updated 7 September 2026.
23 of 27 required criteria PASS; four remain NOT RUN. See the mandatory evidence table.
**Amaç:** Aynı depoda telefonda çalıştırılabilir Expo ürününü kurmak; güvenli giriş,
üyelik çözümü ve koro seçimiyle repertuvar adımına hazır kabuğa ulaşmak.
Sıra/kabul kaynağı: [teslim planı](../mobil-teslim-plani.md), [karar #21](../../KARARLAR.md).

## Başlangıç ve önkoşul

4 Eylül kaydındaki “003 canlı değil” engeli güncelliğini yitirdi. 003 ve 005 canlı
kanıtları kendi brief'lerindedir; 007 altyapısı canlı, allow-list boş.
002 spike ürün değildir.
The product workspace now exists at `apps/mobile/`; setup was implemented on 6 September.
The preparation text below is retained as scope history, not a claim that setup is still absent.
Minimum 008/010 canlı kabulünden sonra bu iş gelir. 010 dış erişim/yetkiyle
beklerse bağımsız, onaylı yerel kurulum/uygulama izole testlerle ilerleyebilir;
canlı kabul açık kalır. Temel limit yalnız somut pilot engelinde öne alınır.
Ticari panel, ödeme, hosting taşıması veya tüm mobil ekranlar önkoşul değildir.

## Kaynak ve kapsam

- AGENTS, altı hafıza özeti, çalışma döngüsü ve geçiş rehberi.
- 002 kurulum/cihaz öğrenimleri; 003/005/007 kanıtları; 008/010 kabul durumu.
- `components/AuthProvider.tsx`: oturum/üyelik/rol ve çıkış davranışı.
- `components/BottomNav.tsx`, `components/AppProviders.tsx`: mevcut gezinme/tema niyeti.
- 005 aktif-koro sözleşmesi; tarayıcı bileşeni veya DOM kodu doğrudan taşınmaz.

Önerilen alan `apps/mobile/`, testleri, gerekli kök workspace/lockfile ayarı ve
ürün testlerinin mevcut `.github/workflows/ci.yml` ile uygun entegrasyonudur.
Kesin yol, paket yöneticisi, komutlar ve güncel Expo sürümleri uygulama başında
doğrulanır. Ortak TS sözleşmesi gerekirse dar kapsamla paylaşılır; sırlar istemciye girmez.
Web ekranları, DB migration, Capacitor ve spike değişikliği kapsam dışıdır.

## Geçiş başlangıç kontrolü

Plan revizyonunda AGENTS/hafıza/yöntem/rehber, MIGRATION/KARARLAR ve eski 004 okundu.
Kod kaynakları uygulama başlangıcında yeniden okunur; bu revizyon kod denetimi değildir.
Uygulayıcı başlangıç commit'i, temiz ağaç/sahiplik, kesin yollar, gerçek ortam,
kullanıcı yetkisi ve gerekli testleri burada kaydeder. Ana ajan tek yazıcıdır.
Bu belge tek başına hesap atama, yayın, e-posta veya harcama yetkisi vermez.

## Uygulama adımları

1. Minimum backend kabulünü ve 005 sözleşmesini doğrula; Expo ürün alanını kur.
2. Giriş, güvenli oturum saklama/yenileme ve çıkışı uygula.
3. Sıfır üyelikte anlaşılır durum; tek üyelikte otomatik koro; çok üyelikte zorunlu
   seçim. Aktif koro sunucuda doğrulanır; seçim başarısızsa veri ekranı açılmaz.
4. Repertuvar akışına hazırlanacak küçük kabuğu ve temayı kur. Çalışmayan beş
   sekme eklemek kabul şartı değildir; PDF/listenin veri uygulaması sonraki brief'tir.
5. Test ve gerçek telefon denemesini kaydet; 004 bitince repertuvar okuma işine geç.

Implementation record: use the mandatory acceptance-evidence table from the brief
template. Define reproducible native checks and integrate appropriate automated
checks into existing CI with the workspace setup. Verify that existing web CI remains
valid. Do not claim CI execution, device acceptance or branch protection from config alone.

## Kabul ve test

- [ ] Ürün alanı spike'tan bağımsız; sürüm/komut/kurulum kaydı yeniden üretilebilir.
- [ ] Yanlış giriş, oturum yenileme, yeniden açılış, sıfır/tek/çok üyelik çalışır.
- [ ] Koro değişimi ve çıkışta önceki koroya ait özel cache temizlenir;
  başarısız seçim/sona eren oturum başka koro verisi göstermez.
- [ ] RN tip/test kapısı; kök ayar/ortak kod değiştiği için `pnpm check` geçti.
- [ ] iOS ve Android geliştirme derlemesi; en az bir gerçek telefonda giriş/seçim/
  çıkış kanıtı var. Diğer platformun gerçek cihaz kabulü pilotta ayrıca izlenir.
- [ ] Sonuç commit/cihaz/platform/ortam/senaryo ile kaydedildi; durum/hafıza güncel.

## Ayrı işler ve geri dönüş

WebView köprüsü, push, mini player/ses, PDF, chat, ödevler ve ana sayfa bu brief'te
uygulanmaz. WebView native oturumu kendiliğinden paylaşmaz; köprü ayrı kabul ister.
Üyelik fixture'ları izole ortamda; gerçek ikinci üyelik ayrı yetkili işlemdir.
Kod geri dönüşü ilgili kod ve belge commit'leridir. Mevcut web davranışı test edilir;
DB/harici dosya göçü bu işin parçası değildir.

## Sonuç kaydı

4 Eylül: ilk kapsam envanteri hazırlandı.
5 Eylül, WF-003: eski 003 engeli kaldırıldı; minimum davet/limit sonrası çalışan
giriş/koro seçimi odağıyla brief güncellendi. Ürün kurulumu ve cihaz testi yapılmadı.

6 September, WF-004: decision #21 removes the automatic limit prerequisite and
allows independent authorized local work while 010 is externally blocked. No product
implementation or new tests were performed in this documentation revision.

## Implementation start-check — 6 September 2026

Filled before implementation, per the migration guide and the brief template.

- **Sources read:** `AGENTS.md`; `docs/gecis-rehberi.md`; `docs/agent-handoff.md`; the six
  `memory-bank/` records; `docs/mobil-teslim-plani.md`; `KARARLAR.md` (#7, #8, #16, #18, #21, #22);
  `MIGRATION.md`; `docs/briefs/010-008-canli-yayin-ve-kabul.md`; `docs/briefs/_TEMPLATE.md`;
  code: `components/AuthProvider.tsx`, `lib/choir-context.ts`, `lib/choir-context.test.ts`,
  `lib/supabase.ts`, root `tsconfig.json` / `eslint.config.mjs` / `vitest.config.ts`,
  `pnpm-workspace.yaml`, `package.json`, `.github/workflows/ci.yml`.
- **Checkout:** branch `main`, commit `a2659ca`, clean working tree, single writer (main agent).
  `main` is 11 commits ahead of `origin/main`; no push is part of this work.
- **Single verifiable outcome:** an Expo product workspace at `apps/mobile/` in which sign-in,
  session persistence/refresh, membership resolution (zero/single/multi), server-verified choir
  selection, per-choir cache clearing and sign-out are implemented and covered by isolated,
  reproducible type and unit checks. Device builds and phone acceptance are not part of this run.
- **Boundary:** native client only. No WebView screen is written or replaced, no PDF/repertoire
  data flow, no push, no player, no chat/assignments/home. No Next.js API route is added; no new
  server logic is introduced at all, so no Edge Function change is required. No DB migration.
- **Preserved behavior:** the web client is unchanged in behavior. `lib/choir-context.ts` keeps its
  exact public API and its existing tests; only its platform-free core is extracted so both clients
  share one 005 active-choir contract (`list_my_choirs`, `set_active_choir`, fail-closed parsing,
  single-`is_current` rule, preference-is-a-hint rule). `lib/repertuvar/annotation-types.ts` is not
  touched. No DOM, `window`, Next or Service Worker code enters the native package.
- **Allowed paths:** `apps/mobile/**` (new); `lib/choir-context-core.ts` (new) and
  `lib/choir-context.ts` (re-export only); root `tsconfig.json`, `eslint.config.mjs`,
  `vitest.config.ts`, `.gitignore` (exclude the native workspace from web tooling);
  `.github/workflows/ci.yml` (add a native job); this brief, `MIGRATION.md` and the affected
  `memory-bank/` records. Everything else is out of scope.
- **Authority for this run:** the user authorized local implementation, local testing and the
  required local commits for the documented mobile plan, one brief at a time. The same message
  withheld production deployment, real-account/real-data, email and spending authority. Therefore:
  no push, no deploy, no live Supabase call, no fixture account, no paid service, no EAS build.
- **Required tests and environments:** `apps/mobile` — `npx tsc --noEmit && npm test` (local
  Linux dev VM, isolated test doubles, no network calls); root — `pnpm check` (local), because
  shared `lib/` code and root tooling settings change. iOS/Android development builds and the real
  phone scenario require macOS/Xcode/Android SDK and a device, none of which exist in this
  environment; they are recorded as NOT RUN, not as N/A, and keep the brief pending.
- **Rollback:** code and documentation commits are separate; reverting them removes the native
  workspace and restores `lib/choir-context.ts` to a single file. Nothing outside the repository
  changes, so no data or release rollback applies.
- **Unresolved:** 010 stays pending (no live authority or Supabase access in this session), so
  live acceptance of invitation/membership remains open and is not implied by anything here.

### Setup decisions verified at implementation start

- Path `apps/mobile/` confirmed. Expo SDK 57 pins taken from a scaffold probe on 6 September 2026:
  `expo ~57.0.20`, `react 19.2.3`, `react-native 0.86.3`, `typescript ~6.0.3`, `@types/react ~19.2.2`.
- Package manager for the native workspace is **npm with its own lockfile**, and the workspace is
  kept out of the root pnpm workspace. Reasons: the documented RN gate is literally
  `npx tsc --noEmit && npm test`; the live web `pnpm-lock.yaml` is not re-resolved, so this brief
  cannot change the production web build; and React Native tooling avoids pnpm's isolated layout.
  The necessary root setting is therefore exclusion from web lint/typecheck/test globs rather than
  workspace inclusion. Revisit only if a later brief needs real cross-package linking.

## Verification start-check — 7 September 2026

- **Sources read:** `AGENTS.md`, `docs/agent-handoff.md`, `docs/gecis-rehberi.md`,
  `docs/ai-calisma-duzeni.md`, all six `memory-bank/*.md` records, `MIGRATION.md`,
  `KARARLAR.md` (including #21–22), `docs/mobil-teslim-plani.md`, this brief and
  `docs/briefs/_TEMPLATE.md`. Inspected native package/Jest/TypeScript/Metro configuration,
  test setup and isolated doubles, auth/UI test entry points and the CI workflow.
- **Checkout:** `main`, `10b6f9f0d4f5abc1b2332f2ec6faeddf34c07206`; clean at entry,
  one worktree and one writer (main agent). Local `origin/main` reference is 19 commits
  behind; no fetch or push. Remote alias and Git identity match AGENTS.
- **One outcome:** rerun the native type/test/bundle gate against this HEAD on macOS and
  record direct evidence in the existing table. No product source differs from `dc5f7a6`
  in `apps/mobile`, `lib` or the CI workflow.
- **Allowed changes:** this brief, a local test transcript under `docs/`, the handoff,
  delivery-plan status and affected repository memory indexes. Generated Metro output
  stays ignored under `apps/mobile/.expo/`. No product behavior, shared contract,
  annotation schema or native/WebView boundary changes are planned.
- **Authority:** the current user message permits local tests, scoped local work and local
  commits only. No push, production access/deploy, real account/data, email or spending.
  Hardware testing remains postponed; 010 stays pending and repertoire/PDF cannot start.
- **Environment/gates:** directly verified Darwin 25.5.0 arm64, macOS 26.5.1 (25F80),
  Node v24.13.1, npm 11.8.0. Run `npx tsc --noEmit && npm test && npm run bundle:check`
  in `apps/mobile` using the existing macOS install. Disable dotenv loading and Expo
  online features; no real account is needed for isolated tests or bundle generation.
  Then check documentation links, status consistency and `git diff --check`.
- **Rollback/uncertainty:** revert only this documentation commit; no data rollback.
  Historical Linux/delete limitations are not assumed to apply to this direct macOS
  environment. The brief header and two status indexes still claim no product workspace;
  reconcile those stale summaries with the existing implementation and evidence without
  changing any acceptance criterion. No independent review or device result is claimed.

## Mandatory acceptance evidence

Filled before implementation. Historical 6 September results are retained below; the native
and Metro rows were rerun directly on macOS on 7 September at `10b6f9f`; Android build
acceptance followed at `6d64d16`. Other PASS rows
retain their original evidence dates and limits; no hardware, web or live test was rerun.

Environments referenced below:
- **NATIVE-VM** — local Linux dev VM on the user's machine (linux-arm64), Node v22.23.2,
  npm 10.9.8, working directory `apps/mobile`.
- **WEB-LINUX** — cloud Linux container (linux-x64), Node v22.22.2, pnpm 11.9.0, running the
  root gate against an extracted copy of this same source tree. The device VM cannot run the
  root gate at all, because the repository's checked-in `node_modules` is a macOS install and
  its native bindings do not load on Linux; nothing in the user's `node_modules` was modified.
- **MACOS** — the product owner's own machine (darwin-arm64), macOS shell,
  commands run by the user on 6 September 2026 around 22:10–22:15 Europe/Istanbul and reported
  back in full. Node version was not recorded. This is the environment that actually builds and
  will later run the native app.
- **MACOS-HEAD** — direct agent execution on 7 September 2026, macOS 26.5.1 /
  Darwin 25.5.0 arm64, Node v24.13.1, npm 11.8.0. Existing dependencies reused;
  `CI=1 EXPO_NO_DOTENV=1 EXPO_OFFLINE=1`. [Captured output](004-native-gate-2026-09-07.md).
- Historical implementation revision: `main` at `a2659ca` plus this brief's changes, committed as `3009afe`
  (production code). This documentation update is a separate commit.

| Criterion / expected behavior | Required? / N/A reason | Status | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Product workspace exists at `apps/mobile/`, independent of `spike/`, with recorded versions and reproducible install/type/test commands | yes | PASS | 6 Sep 2026, NATIVE-VM, `npm install` then `npx tsc --noEmit && npm test` | Expo SDK 57 pins in `apps/mobile/package.json` and `package-lock.json` (`expo ~57.0.20`, `react 19.2.3`, `react-native 0.86.3`, `typescript ~6.0.3`). No import from `spike/`. Limit: the lockfile was materialized on linux-arm64; a macOS contributor reinstalls to get their own binaries |
| Wrong credentials produce a visible, non-crashing error and no session | yes | PASS | 6 Sep 2026, NATIVE-VM, `npm test` | `auth-store.test.ts` "reports wrong credentials without starting a session"; `AppRoot.test.tsx` "shows the reason when sign-in is rejected". Isolated doubles; no live Auth was contacted |
| A stored session is restored on app relaunch, and a refresh that yields no session signs out fail-closed | yes | PASS | 6 Sep 2026, NATIVE-VM, `npm test`; relaunch also confirmed on MACOS in the simulator | `auth-store.test.ts` "restores a stored session on relaunch…" and "signs out fail-closed when a token refresh yields no session". Limit: the failed-refresh path is driven through an auth-state event, not a real expired token |
| Session storage adapter chunks large tokens, drops stale chunks and wipes a damaged entry instead of returning half a token | yes | PASS | 6 Sep 2026, NATIVE-VM, `npm test` | `secure-storage.test.ts`, six cases including missing-chunk wipe and legacy value |
| Tokens are actually written to the device keychain/keystore and appear in no plain storage or log | yes | NOT RUN | requires real hardware; the simulator is not a device, and plain-storage/log inspection was not performed | Code wires `expo-secure-store` in `src/auth/supabase-client.ts`; unit coverage uses an in-memory double. The own-build relaunch on the simulator shows the adapter round-tripping a real session, which is supporting evidence but not the hardware check this criterion asks for |
| Zero membership shows an understandable state and opens no data screen | yes | PASS | 6 Sep 2026, NATIVE-VM, `npm test` | `auth-store.test.ts` "shows an explicit state and opens no data screen without a membership"; `AppRoot.test.tsx` asserts the shell is absent |
| Single membership is activated automatically through the server RPC | yes | PASS | 6 Sep 2026, NATIVE-VM, `npm test` | `auth-store.test.ts` "activates a single membership through the server"; asserts `set_active_choir` was called |
| Multiple memberships require an explicit choice; without a confirmed selection no data screen opens | yes | PASS | 6 Sep 2026, NATIVE-VM, `npm test` | `auth-store.test.ts` "requires an explicit choice…" (no `set_active_choir` call) and `AppRoot.test.tsx` "requires a choice for multiple memberships before any data screen" |
| Active choir is accepted only when the database confirms it; a mismatched activation response is rejected | yes | PASS | 6 Sep 2026, NATIVE-VM, `npm test` | `auth-store.test.ts` "rejects an activation the database did not confirm" and "trusts the server-confirmed choir without asking again" |
| A stored hint or requested choir outside the account's memberships is refused, before any server call | yes | PASS | 6 Sep 2026, NATIVE-VM, `npm test` | `auth-store.test.ts` "ignores a hint that does not belong to the account" and "refuses a choir the account is not a member of, before any server call" (asserts zero RPC calls) |
| Choir switch clears the previous choir's private cache before new data is requested | yes | PASS | 6 Sep 2026, NATIVE-VM, `npm test` | `auth-store.test.ts` "clears the previous choir cache before requesting the switch" asserts call order `clear-caches` then `rpc:set_active_choir`. Limit: the shell has no tenant cache yet; this proves the seam, not a real cached PDF |
| A refused switch leaves no active choir | yes | PASS | 6 Sep 2026, NATIVE-VM, `npm test` | `auth-store.test.ts` "keeps no active choir when the switch is refused" |
| Sign-out clears session, per-user choir hint and tenant caches, including when the network call fails | yes | PASS | 6 Sep 2026, NATIVE-VM, `npm test` | `auth-store.test.ts` two sign-out cases; identity change case also clears the previous user's hint |
| Running-app flow: rejected sign-in, automatic single-membership choir, session restored after a full relaunch, sign-out returning to the login screen | yes | PASS | 6 Sep 2026, MACOS, iOS Simulator (iPhone 17 Pro, iOS 26.5); four scenarios executed manually by the product owner twice — first on the Expo Go-hosted bundle, then repeated on the project's own `expo run:ios` build | All four behaved as specified in both runs. The second run is the one that counts: the session was persisted and restored through `expo-secure-store` inside this app's own keychain scope. Limit: a simulator is not hardware, so real-device behavior is still unproven |
| Membership list parsing fails closed on a malformed RPC payload | yes | PASS | 6 Sep 2026, NATIVE-VM, `npm test` | `auth-store.test.ts` "fails closed on a malformed membership payload"; shared parser is the same one the web client uses |
| Web behavior preserved: `lib/choir-context` public API and its existing tests unchanged | yes | PASS | 6 Sep 2026, WEB-LINUX, `pnpm test:coverage` | 32 files / 190 tests passed, including `lib/choir-context.test.ts` unmodified. The module now re-exports the shared core and adds `isChoirId` / `ChoirContextClient`; no export was removed or renamed |
| Native gate: `npx tsc --noEmit && npm test` in `apps/mobile` | yes | PASS | 7 Sep 2026, `10b6f9f`, MACOS-HEAD; `npx tsc --noEmit && npm test && npm run bundle:check`, exit 0 | [Direct transcript](004-native-gate-2026-09-07.md): TypeScript silent; 4 suites / 35 tests passed. Existing macOS install, isolated doubles; no live Auth or hardware. Historical 6 Sep NATIVE-VM/MACOS passes retained in the preceding record |
| Web gate: `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm test:service-worker` | yes | PASS | 6 Sep 2026, WEB-LINUX (scripts run separately) and MACOS (single `pnpm check` run) | All exit 0 in both. 32 files / 190 tests; coverage 92.93% statements / 81.77% branches, above the configured thresholds |
| Web gate: `pnpm build` | yes | PASS | 6 Sep 2026, MACOS, `pnpm check` run to completion | `next build` compiled successfully in 3.1s; types checked, 17 static pages generated, full route table produced. Earlier WEB-LINUX attempts could not reach this step because the session's egress policy blocks the `next/font` fetch to `fonts.googleapis.com`; that was an environment limit, not a code failure |
| Metro bundles the native entry point, resolving both the workspace's nested dependencies and the shared `@shared/*` contract | yes | PASS | 7 Sep 2026, `10b6f9f`, MACOS-HEAD; `npm run bundle:check` as the final step of the native chain, exit 0 | [Direct transcript](004-native-gate-2026-09-07.md): iOS export bundled 660 modules in 4366 ms; 2.2 MB `.hbc` plus metadata generated in ignored `.expo/bundle-check`. Uses the normal Hermes bytecode step (no `--no-bytecode`). No app launch, real environment values or device acceptance; historical simulator evidence remains dated 6 Sep |
| Native checks integrated into `.github/workflows/ci.yml`; existing web jobs unchanged | yes | PASS | 6 Sep 2026, NATIVE-VM, workflow YAML parsed; `npm install --package-lock-only --dry-run` | New `mobile` job runs `npm ci`, `npx tsc --noEmit`, `npm test` in `apps/mobile`; `quality` and `browser` jobs are untouched; `package.json` and `package-lock.json` verified in sync |
| `npm ci` reproduces the native workspace from the committed lockfile | yes | PASS | 6 Sep 2026, MACOS, `rm -rf node_modules && npm ci` in `apps/mobile` | 1118 packages installed, 1119 audited; the subsequent type and test run passed. This is the exact command the new CI job uses. Limit: deprecation warnings and 10 moderate advisories were reported by npm and are not addressed in this brief |
| CI actually executed for this revision | yes | FAIL | 7 Sep 2026, `4e698f5`, GitHub Actions run [#19](https://github.com/genesinovachoir/genova_app/actions/runs/34126230982), `pull_request` event from draft PR [#7](https://github.com/genesinovachoir/genova_app/pull/7) | The run completed. `Native product checks` PASS (`npm ci`, `tsc --noEmit`, `npm test`, `bundle:check` all green) and `Browser regression` PASS (`pnpm test:e2e`, which builds the app itself). **`Quality and security` FAILED at `Run pnpm check`**, so `pnpm audit` was skipped. Acceptance needs all three green, so this criterion is FAIL, not PASS. The failing step's root cause is **not yet verified** — see below |
| iOS development build runs on a device or simulator | yes | PASS | 6 Sep 2026, MACOS, `npx expo run:ios` | The project's own native iOS build was generated and launched on the iOS Simulator (iPhone 17 Pro, iOS 26.5); the app runs as Genova rather than inside Expo Go. Built locally with Xcode, no EAS and no spending. Limit: simulator only, no hardware |
| Android development build runs on a device or emulator | yes | PASS | 7 Sep 2026, `6d64d16`, direct macOS; Expo Android prebuild, Gradle ARM64 `assembleDebug`, adb install/launch on dedicated API 36 emulator | [Build, launch and UI evidence](004-android-build-2026-09-07.md): 160 tasks, own debug APK installed; signed-out screen and empty-form validation visually/XML verified. Synthetic loopback configuration, no real account/device. Initial disk/Metro connection failures resolved before acceptance |
| Real-phone scenario: sign-in → choir selection → sign-out with a real account | yes | NOT RUN | needs a device and a real account; real-account authority was explicitly withheld | A missing phone is not substituted by any local result |
| Live invitation/membership acceptance (010) available for the native flow | yes | NOT RUN | 010 stays pending: no live deployment authority and no Supabase MCP/CLI access in this session | See the 010 brief; nothing live was attempted |

**Optional progress: 23 passed / 27 required criteria.** Three are NOT RUN and one now FAILs, so
004 stays **partial/pending**. No criterion was deleted, weakened or waived, and no test was
skipped or loosened to reach a green result.

**Count correction, 7 September:** the committed HEAD table already contained 27 required
rows (22 PASS, 5 NOT RUN), although the summary said 21/26. This is an arithmetic correction,
not an added/removed criterion or a newly accepted device/live check. The native/Metro
rerun refreshes two existing PASS records and leaves all five NOT RUN criteria in place.

### Diff self-review — 6 September 2026

This was a **self-review**, not an independent review; no reviewer agent was involved.

- `git status`/`git diff --stat` show changes only in the allowed paths: `apps/mobile/**` (new),
  `lib/choir-context-core.ts` (new), `lib/choir-context.ts`, `tsconfig.json`, `eslint.config.mjs`,
  `vitest.config.ts`, `.gitignore`, `.github/workflows/ci.yml` and this brief. `git diff --check`
  is clean. No web screen, API route, migration, Edge function or `spike/` file was touched.
- The shared extraction was reviewed against the 005 contract: parsing rules, the single
  `is_current` requirement, the `set_active_choir` echo check and the "preference is only a hint"
  rule are byte-identical to the previous implementation; only the client parameter type became
  structural (`ChoirContextClient`), which was necessary because the two workspaces resolve
  different `@supabase/supabase-js` builds and the nominal `SupabaseClient` types are not
  interchangeable. Every previous export still exists.
- One deliberate difference from the web client: the native store clears tenant caches *before*
  requesting the switch, where the web provider clears them after `activateChoir` succeeds. Both
  clear before any new-choir data is read; the native order is the stricter one. Pixel or
  code-path parity between clients is not a goal (decision #2), but this difference is recorded
  rather than left implicit.
- `AuthProvider` deliberately holds no rules; if a later brief adds screens, the acceptance
  behavior stays in `auth-store.ts` where it is testable without a device.
- Known gap accepted for this brief: member record and role resolution (`Şef` / `Partisyon Şefi` /
  `Korist`) are not loaded natively yet. The shell needs only the server-confirmed choir; role-aware
  screens belong to the repertoire brief and must not be assumed to exist.

### Delivery — 6 September 2026

- Commits: production code and documentation are separate and carry the `004` id. Nothing was
  pushed; `main` remains ahead of `origin/main` and no deployment was triggered.
- Remaining risk: the app has never been built for or run on a device, and the whole native flow
  depends on 010's live acceptance, which is open.
- 6 September follow-up: the product owner ran both gates on MACOS. `pnpm check` passed end to end
  including `next build`, and `npm ci` plus the native gate passed after a clean reinstall. A first
  attempt failed only because shell comments appended to the pasted commands were parsed as
  arguments by zsh, and a second because a Linux-installed `node_modules` was reused on macOS;
  neither was a defect in this revision's code.
- 6 September, second follow-up: the first `expo run:ios` attempt exposed a real defect that no
  unit test could catch — `metro.config.js` set `disableHierarchicalLookup`, so Metro could not
  resolve `expo-asset`, which npm installs nested inside the `expo` package. Fixed in `dc5f7a6`
  together with a `bundle:check` script and a CI step, and the criterion above was added rather
  than leaving the gap undocumented. `apps/mobile/node_modules` is shared between the product
  owner's macOS shell and the agent's Linux VM over the same folder, and each platform's install
  invalidates the other's; macOS is treated as the authoritative install, so the agent does not
  run `npm install` there.
- 6 September, third follow-up: `npx expo run:ios` produced and launched the project's own iOS
  build on the simulator, and the four flow scenarios were repeated there and passed. The product
  owner has an Android phone but chose to postpone the real-device test, and explicitly asked that
  the brief not be re-scoped, so the real-phone and device-keychain criteria stay NOT RUN in place
  rather than being moved to the pilot stage. 004 therefore remains partial/pending by the owner's
  own choice, not for lack of a decision.
- Rollback: revert the 004 code and documentation commits; `lib/choir-context.ts` returns to a
  single file and `apps/mobile/` disappears. No live system is involved.
- 7 September follow-up: the first handoff action is complete at `10b6f9f`; the native gate
  and standard iOS Hermes export passed directly on macOS. See the existing evidence table
  and [captured output](004-native-gate-2026-09-07.md). No product file was changed.
- Next single step: coordinate the owner-assisted Android development-build prerequisites
  (Android Studio/default SDK and generated Android project are absent). Ask before treating
  the postponed phone/keychain test as due; real-account/data work also needs explicit
  authority. CI needs separately authorized push, and 010 remains pending. Do not begin
  repertoire/PDF before 004 is accepted. Entry point: [agent handoff](../agent-handoff.md).

### Verification self-review — 7 September 2026

This is a self-review by the main agent; no independent reviewer was used.
The intended diff contains only evidence and affected status/handoff documentation. Product
sources, lockfiles, tests, CI configuration, annotation contracts and MIGRATION's screen
boundaries are unchanged. The table's criterion names, required flags and five NOT RUN
statuses are preserved. The Android row only refreshes prerequisite evidence. The root
`pnpm check`, browser tests, `npm ci`, native device builds, remote CI and live 010 were
not rerun; prior results retain their original dates. Rollback is this documentation commit only.

Documentation verification on 7 September, direct macOS execution: a local Python check
resolved all 79 local links across the seven changed/new Markdown files (zero missing targets),
compared all 27 criterion names/required flags/statuses with `git show HEAD:<brief>` and found
them identical, and confirmed no product/configuration or `MIGRATION.md` diff. The transcript's
evidence-table anchor exists. `git diff --check` passed. Manual self-review confirmed that the
current decision #21 order, 010 pending state and postponed hardware boundary are preserved.

Commit preparation found a trailing blank line in the new transcript; it was removed and
`git diff --cached --check` then passed. The commit subsequently hit an existing empty
`.git/HEAD.lock` (modified 6 September 22:52 local time). No active Git process was found;
`lsof` showed only an Apple reader. The stale file was preserved in `.git/_stale_locks/`
before retrying the local commit. No product files or other worktree edits were involved.

## Android build start-check — 7 September 2026

- **Checkout/ownership:** `main` at `6d64d1677c82b95611ec4141b7a22edf1a169f1e`, clean
  at entry; main agent is the sole writer. Sources from the preceding start-check remain
  applicable; reread current evidence, app config, native Auth initialization and ignore rules.
- **Outcome:** build this project's Android development app and verify it launches on an
  isolated emulator. The user explicitly asked to continue with this next step. Real-phone,
  device-keychain and real-account scenarios remain postponed/unapproved; 010 and CI stay pending.
- **Discovery correction:** the prior check covered conventional paths only. Existing tools
  are under `/opt/homebrew/share/android-commandlinetools`: SDK platforms 35/36, build tools
  34/35/36, CMake 3.22.1 and NDK 27.1.12297006. Java 17.0.20 is installed through Homebrew
  but not registered with macOS `java_home`. React Native's installed version catalog requires
  SDK 36 and that NDK. No Android Studio or AVD is present; use existing command-line tools.
- **Allowed paths/actions:** ignored `apps/mobile/android/` and `.expo/`; additive local
  emulator/system-image packages in the existing SDK and a dedicated Genova AVD; this brief,
  evidence under `docs/`, handoff and affected status indexes. A narrowly necessary source/config
  fix must be recorded separately and tested; generated files are never hand-edited or committed.
- **Preservation/authority:** no web/shared-contract/annotation or native/WebView boundary change;
  no push, deployment, live access, account/data action, email or spending. Disable dotenv and
  use synthetic public client settings pointing only to loopback for app launch. Do not connect
  any physical phone or use any pre-existing emulator session/account.
- **Checks:** Android prebuild/build/install; emulator process and actual UI evidence; inspect
  app crash output. Run native gates if source/config changes; root `pnpm check` only if its
  governed paths change. Retain the four other acceptance gaps even if this build passes.
- **Rollback:** documentation commit can be reverted. Stop the task-owned emulator/Metro,
  retain reusable SDK dependencies and record generated artifacts; any cleanup targets only
  this task's AVD/output. No production rollback applies. Initial disk space: 21 GiB available.

### Android acceptance — 7 September 2026

The Android criterion now PASSes on `6d64d16`, with [build/UI evidence](004-android-build-2026-09-07.md).
All other criterion names, required flags and statuses remain unchanged. Current count is
23 PASS / 27 required, four NOT RUN; the earlier 22/27 count remains a historical correction.
No production source changed, so the already-passing native and web gates were not rerun.
Self-review only: generated Android files remain ignored, native/WebView boundaries preserved.
Next step requires the owner's decision on resuming postponed hardware tests and explicit
real-account authority; remote CI/push and 010 remain separately blocked. No repertoire work.

Android follow-up documentation verification: eight Markdown files / 99 local links resolved;
`git diff --check` passed. Programmatic comparison with entry HEAD confirms exactly one
status change (Android NOT RUN → PASS), no criterion name/required-flag changes, and no
product/configuration diff. Screen targets in `MIGRATION.md` are unchanged. The self-review
checked screenshots/XML, build result and known environment failures against the criterion.
Task-owned Metro and emulator were stopped after capture. This documentation/evidence
commit is local only; the brief remains partial/pending.

## Handoff start-check and next-task contract — 7 September 2026

- **Request:** the owner explicitly postponed the real-device step again and requested a
  fresh-session handoff plus a reasoned next step. Do not ask to resume the phone test as
  the receiving agent's automatic first action. Existing criteria remain in place.
- **Entry checkout:** `main`, `01ce1f1412f89427e8026c68455bd756709b3b77`; clean,
  one worktree, main agent sole writer; no inherited unfinished edits. The local tracking
  ref is 21 commits behind (no fetch). Product/native/shared/CI sources have no diff since
  `dc5f7a6`. The ignored Android APK hash still matches its acceptance record; Metro 8081
  and task emulator processes were absent at this check. No product test was rerun.
- **Sources:** reread AGENTS, migration guide, working cycle, existing handoff, six memory
  records, MIGRATION, decisions, delivery plan, brief template, this evidence table,
  native/Android evidence records, 010 and `.github/workflows/ci.yml`.
- **This handoff's allowed edits:** this brief, `docs/agent-handoff.md`, relevant
  `memory-bank/` summaries only. Preserve product/configuration, evidence artifacts,
  MIGRATION screen targets, all acceptance names/required flags/statuses and historical dates.
  Authority is documentation/local commits; no push, deployment, production, accounts,
  email, spending or hardware test. Rollback: this documentation commit only.

### Next bounded task: 004 CI execution readiness (recommendation, not execution authority)

**Why:** hardware is intentionally postponed. The other two open gates are remote CI and
010 live acceptance. A scoped CI readiness review can prepare a concrete decision without
phone access or production mutation. It does not accept CI and cannot close 004. Starting
repertoire/PDF or inventing extra infrastructure to bypass acceptance is not authorized.

**First concrete action after startup verification:** read `.github/workflows/ci.yml`,
compare `origin/main...HEAD` and inspect the proposed revision's release-impact diff.
The current local findings are a starting point, not a reason to repeat checks unchanged:
`push` triggers only on `main`; `pull_request` and `workflow_dispatch` are also defined.
The pending range includes 008 web invitation routes, Edge code and its DB migration,
plus 009 and native/shared changes. A plain `main` push can publish web code before the
010 DB → Edge → web sequence is satisfied. A branch push alone is not configured to
trigger this workflow; a PR/dispatch route would require remote availability, hosting
integration and permissions to be checked rather than assumed.

**Deliverable:** in this brief, prepare one precise CI execution proposal: exact repository,
revision/ref and commit range; jobs to run; proposed trigger; any preview/production effects;
which hosting/account facts remain unknown; expected evidence and any required approval.
Prefer a route that does not publish production. Do not claim a non-main ref is automatically
free of preview/deployment effects. Use read-only remote configuration checks only within
existing access authority; if unavailable, name the exact missing check and stop that step.
Do not mutate hosting settings or create a remote branch/PR/run during local preparation.

**Relevant files:** `.github/workflows/ci.yml`, `apps/mobile/package.json` and lockfile,
`apps/mobile/metro.config.js`, root `package.json`, this brief, and the dependency/order
source `docs/briefs/010-008-canli-yayin-ve-kabul.md`. Inspect only relevant outgoing
web/Edge/migration paths to explain release impact; do not implement or start 010.

**Preparation acceptance:** proposal identifies exact code, trigger, required jobs, hosting
unknowns and separate authorization; documentation links/diff pass; no required criterion
changes. **Actual CI acceptance** still needs a successful remote run tied to the relevant
revision, job results and run reference. Local reproduction/configuration is not that proof.
If source/build configuration changes are needed, record their scope first, preserve tests,
run the AGENTS gates and keep code/documentation commits separate. Push, PR/run dispatch,
production work, real data/email and spending remain withheld until explicitly authorized.

After CI readiness is prepared, ask only for the concrete remote operation needed; do not
ask the owner again whether the phone test is due. 010 remains pending until separately
selected/authorized. If neither remote path is authorized, pause with a complete handoff;
there is no local-only route to 004 acceptance under the unchanged criteria.

### Handoff acceptance evidence (documentation only)

This is separate from product acceptance; the 27-row product table remains authoritative.

| Handoff requirement | Required | Status | Evidence / boundary |
|---|---|---|---|
| Checkout, ownership, sources and latest owner deferral recorded | yes | PASS | 7 Sep, `01ce1f1`, direct local inspection above; no inherited edits |
| Current/historical, deployed/local/unverified states separated; next task and authority precise | yes | PASS | 7 Sep, `01ce1f1` plus this documentation diff; main-agent self-review against decisions #21/#22, user deferral, 004/010 and dated evidence. No independent review |
| Local links, unchanged product criteria and diff checked | yes | PASS | 7 Sep, direct local Python validation: five allowed Markdown files, 73 local targets and four anchors valid; product table byte-identical (27 rows, 23 PASS, four NOT RUN); `git diff --check` passed |

No independent review or receiving-agent execution is claimed. Product remains 23/27 PASS
with four NOT RUN criteria regardless of completion of this documentation-only handoff.

Handoff self-review exercised the receiving-agent paths: hardware remains deferred; missing
remote authority yields a proposal rather than push; CI success alone leaves three other
product gates; historical simulator/Android evidence never becomes live or hardware proof.
All five edited files are documentation/index records; original test transcripts and
screenshots are unchanged. No new product tests, remote checks, fixture access or deployments
ran for this handoff. Documentation acceptance is complete; underlying 004 is not.

## CI execution-readiness proposal — 7 September 2026

Prepared under the [next-task contract](#next-bounded-task-004-ci-execution-readiness-recommendation-not-execution-authority).
**This is preparation, not execution.** No remote operation was performed: no fetch, push,
branch, pull request, run dispatch, hosting change or account access. The 27-row product
table above is untouched and still reads 23 PASS / four NOT RUN; preparing a proposal
changes no criterion, and remote CI stays NOT RUN.

### What was actually inspected

All checks below are local and read-only, run on 7 September 2026 against `main` at
`d9ab194` in the agent's Linux VM on the owner's machine.

| Check | Command or source | Result |
|---|---|---|
| Checkout | `git rev-parse`, `git status`, `git worktree list` | `main` at `d9ab194`, clean tree, one worktree, no inherited edits |
| Workflow content | `.github/workflows/ci.yml` at HEAD | Unchanged since `dc5f7a6`; three jobs, triggers `push:[main]`, `pull_request`, `workflow_dispatch` |
| Cached remote workflow | `git show origin/main:.github/workflows/ci.yml` | Same three triggers, **no `mobile` job** — the native job exists only in unpushed commits |
| Outgoing range | `git rev-list --count origin/main..HEAD` | 22 commits, from a **cached** `origin/main` ref last written 5 Sep 20:31 pointing at `0389242` |
| Range content | `git diff --name-status origin/main..HEAD` | Adds `/invite` and `/koristler/davetler` pages, `InvitationManager`, `lib/choir-invitations`, the 008 migration and two Edge functions; root `package.json`, `pnpm-lock.yaml` and `next.config.ts` are unchanged |
| Audit step | `pnpm audit --prod --audit-level high` | Exit 0, one low advisory. Point-in-time: the advisory database changes over time |
| Build-time env dependency | `node -e` calling `createClient(undefined, undefined)` from the repository's own `@supabase/supabase-js` | Throws `supabaseUrl is required.` |
| Import chain | `app/layout.tsx` → `components/AuthProvider.tsx` → `lib/supabase.ts` | The client is constructed at module scope from `process.env.NEXT_PUBLIC_SUPABASE_*` |
| Remote branch inventory | `git branch -r` (cached) | Six open `dependabot/*` branches and `codex/003-tenant-cutover` exist besides `main` |

### Predicted blocker: the `quality` job has no Supabase environment

This is **analysis, not a test result.** It has not been reproduced end to end, because
neither available environment can run `next build` for this repository: the owner's
`node_modules` is macOS-only and the sandboxed Linux copy fails earlier, at the
`next/font` fetch its egress policy blocks.

The reasoning: `pnpm check` ends in `next build`; `app/layout.tsx` wraps every route in
`AuthProvider`, which imports `lib/supabase.ts`, which calls `createClient` at module scope;
17 routes prerender, so that module executes during the build; and `createClient` throws
without a URL, as the command above shows. The workflow's `quality` job sets no `env:`
block and references no secret or variable, and GitHub does not inject either implicitly.

The same repository treats this as a known requirement elsewhere: `playwright.config.ts`
gives its `webServer` synthetic `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` and `APP_URL` values, and that server runs
`pnpm build` itself. So the `browser` job supplies what it needs and the `quality` job does
not. Locally the build only passes because `.env.local` exists and is gitignored.

Consequence to expect from any run of the current workflow: `browser` and `mobile` should be
self-sufficient, and `quality` should fail at its build step. Fixing that is a workflow change
with its own scope, review and commit — not something to slip into this preparation.

### Routes to a real CI run, and what each would actually do

**Route A — push `main`.** Triggers CI, and also publishes to production. The outgoing range
adds the 008 invitation UI while its migration `20260905210953_choir_invitations_008.sql` and
the `choir-invitations` Edge function are **not deployed**. That inverts the DB → Edge → web
order [010](010-008-canli-yayin-ve-kabul.md) requires and would expose real users to a feature
whose backend does not exist. **Not recommended, and out of the current authority.**

**Route B — push a side branch, open a pull request into `main`.** `push` is filtered to
`main`, so the branch push alone triggers no run; the pull request triggers CI on the merge
ref, exercising the workflow version from the branch, which is the one containing the `mobile`
job. Nothing merges. The open caveat is hosting: a branch push can still produce a Vercel
preview deployment, and a preview's environment values are a remote setting nobody has
checked. This must not be assumed harmless.

**Route C — `workflow_dispatch`.** It does not avoid a write: dispatch runs a ref that has to
exist on the remote, so the branch must be pushed first, and dispatching against the current
`origin/main` would run the older workflow that has no `mobile` job.

**There is therefore no zero-write route to remote CI evidence.** Every route needs at least
one push, which is exactly the authority this session does not hold.

### Remote facts that remain unknown

Named rather than guessed, as the contract requires; none of these was checked, because doing
so needs either network access to the remote or account access that was not granted.

1. The real `origin/main` head. The local ref is a two-day-old cache, so "22 commits" is a
   local figure. A `git fetch` would settle it and was deliberately not run.
2. Whether GitHub Actions is enabled and whether this workflow has ever completed. Six
   dependabot branches exist, which suggests pull requests have been opened, but an opened
   pull request is not a passing run.
3. Whether repository secrets or variables exist. Even if they do, the workflow references
   none, so they cannot reach the `quality` build without a workflow change.
4. Branch protection and required checks on `main`.
5. The Vercel Git integration: which branch is production, whether preview deployments are
   enabled, what environment values previews receive, and whether an ignored-build-step rule
   exists. If previews carry production Supabase credentials, a preview is a production data
   risk, not a safe sandbox.
6. Whether any deploy hook or third-party integration reacts to branch pushes.

### What would actually close the CI criterion

A completed run on the remote, tied to a specific commit SHA in this repository, with the run
reference recorded here and all three jobs green — `quality`, `browser` and `mobile`. A local
reproduction, a passing configuration review, or a run on a different revision is not that
evidence. If `quality` fails for the environment reason above, the criterion stays NOT RUN
until the workflow is corrected and re-run.

### Concrete approval request

Nothing below has been done. Each step is separable, and the first two involve no write.

1. **Refresh the remote ref.** Permission to run `git fetch origin` — read-only, changes no
   remote state — so the outgoing range and the real `origin/main` are facts rather than a
   two-day-old cache.
2. **Owner-side settings check.** Please report, from the Vercel project and the GitHub
   repository settings: the production branch; whether preview deployments are enabled for
   non-production branches; which environment values previews receive; and whether `main` has
   branch protection. No agent access to those accounts is requested.
3. **Then, if you choose Route B**, authorize exactly this and nothing more: push the current
   `d9ab194` to a new remote branch `ci/004-native-check`, and open a draft pull request into
   `main` that is not merged. Explicitly excluded: pushing `main`, merging, dispatching runs
   on other refs, and any hosting change.
4. **If the `quality` build fails as predicted**, authorize a separate, scoped workflow change
   adding the needed environment to that job, as its own 004 code commit with its own gates.
   Whether those values are synthetic, as in the Playwright config, or real repository
   secrets is a decision for you, not an implementation detail to pick silently.

If none of these is authorized, this preparation is complete and 004 stops here: no local-only
path closes the CI criterion, hardware stays deferred by the owner's earlier choice, and
[010](010-008-canli-yayin-ve-kabul.md) remains the separate live route rather than a follow-on.

### Preparation self-review

Self-review by the main agent; no independent review, and no receiving-agent execution is
claimed. The diff for this work touches documentation only. Checked against the contract: the
proposal names an exact repository, revision, branch, trigger and job set; it states the
production and preview effects instead of assuming a non-`main` ref is safe; it lists the
unknown remote settings rather than guessing them; it separates a predicted failure from a
measured one; and it requests only the narrow remote operation needed. No required criterion
was added, removed, reworded or re-scored, and the phone test is not raised again.

### Connector access check — 7 September 2026 (read-only)

The owner asked the agent to use the connected Supabase and Vercel connectors. Two read-only
listings were run and both returned a decisive negative result, so the connectors were used
no further and nothing was created, changed, deployed or paused.

| Check | Command | Result |
|---|---|---|
| Supabase account contents | `list_projects` | One project only, belonging to an unrelated site in a different organization. **Genova's `hievmwwctjjlhmssoxsu` is not in the connected account** |
| Vercel account contents | `list_teams`, then `list_projects` | A single hobby-plan team with **zero projects**, so the live web project behind `app.genesinovachoir.com` is not in the connected account either |

**Conclusion:** both connectors are authenticated to an account that does not own the Genova
resources. This explains, rather than removes, the long-recorded "MCP unauthorized" state: the
problem was never a missing grant on the right account but a connection to the wrong one.

Consequences for the [CI proposal](#ci-execution-readiness-proposal--7-september-2026): its
unknown remote fact 5, the Vercel production branch and preview settings, **cannot** be answered
through the connected Vercel connector and still needs the owner. For
[010](010-008-canli-yayin-ve-kabul.md), the connected Supabase connector is not a usable route
to the shared project and must not be substituted for one; per AGENTS the only permitted project
is `hievmwwctjjlhmssoxsu`, and switching to another organization's database is forbidden.

No write, migration, function deploy, cost confirmation or project mutation was attempted on
either account, and the unrelated project found in the Supabase account was not read or touched.

### Remote git reachability from the agent sandbox — 7 September 2026

Checked because the owner asked the agent to run the remote steps itself.

| Check | Result |
|---|---|
| `ls ~/.ssh` in the agent VM | Absent; no key material of any kind |
| `ssh -T git@github.com` | `Could not resolve hostname` — no SSH transport |
| `curl https://github.com` | 200; HTTPS reaches GitHub through the egress proxy |
| Connector registry search for GitHub | No GitHub connector available to install |

The remote is configured as SSH (`git@github-genesinova:...`), whose alias and key live in the
owner's macOS `~/.ssh`, outside the single connected folder. So `git fetch`, `git push`, branch
creation and pull requests **cannot** run from the agent sandbox regardless of authorization.
Copying a private key into the sandbox is not an option: AGENTS forbids secrets in prompts,
command output or records. These steps stay with the owner, who runs the commands the agent
prepares. This is a capability limit, not a missing permission.

### Access re-check after the owner reconnected the connectors — 7 September 2026

The owner reconnected the connectors and ran the fetch. All checks below are **read-only**:
no migration, function deploy, SQL execution, variable change, redeploy, cost confirmation or
project mutation was attempted anywhere. This supersedes the previous connector access check.

| Subject | Check | Result |
|---|---|---|
| GitHub remote | Owner ran `git fetch origin` then `git rev-list --left-right --count origin/main...main` on macOS | `0 24` — **`origin/main` has not moved**; local `main` is 24 commits ahead. CI proposal unknown 1 is resolved, and the earlier cached figure was accurate |
| Supabase account | `list_projects` | Now the **correct** project: `hievmwwctjjlhmssoxsu`, `genesinovachoir's Project`, org `urpuzollmvvdkayavnhd`, Postgres 17, `ACTIVE_HEALTHY`. AGENTS' required project is reachable at last |
| Supabase migrations | `list_migrations` on `hievmwwctjjlhmssoxsu` | 50 migrations, the newest `20260905160539 operator_controlled_choir_creation_007`. **`20260905210953_choir_invitations_008` is absent** |
| Supabase Edge functions | `list_edge_functions` | `send-email`, `send-push-notification`, `drive-manager`, `drive-manager-test`, `drive-manager-v2` (v19), `create-choir` (v2), `resend-inbound` (v3). **`choir-invitations` is absent** |
| Railway | `whoami`, `list-projects` | Authenticated as `genesinovachoir`, one project `genova-staging` created 4 September, in the workspace of the same name |
| Vercel | `list_teams`, `list_projects` | Zero teams, and a personal-scope listing returns `Failed to list projects.` The live web project is still not reachable through this connector |

**What this changes.** The long-standing "MCP unauthorized, access unknown" state is over for
Supabase and Railway: both are now connected to the right account, and the 008 preconditions are
no longer inferred from repository files but **observed on the live project** — the migration is
not applied and the Edge function does not exist, exactly as [010](010-008-canli-yayin-ve-kabul.md)
assumed. That confirms the release-impact warning in the CI proposal above: pushing `main` today
would publish invitation UI against a database and Edge surface that do not have it.

**What this does not change.** No product criterion moves; 004 stays at 23 of 27 with four NOT RUN,
and remote CI is still unrun. 010 is still pending and still requires its own authorization,
a fresh backup and restore evidence before any schema step. Railway remains preparation: a single
staging project is not a hosting move, and nothing about it was altered.

**Still unknown.** The Vercel production branch, preview-deployment settings and preview
environment values — CI proposal unknown 5 — remain unanswered, because the connected Vercel
account does not expose the project. Either that connector needs the account that owns
`app.genesinovachoir.com`, or the owner reports those settings manually.

**Two small discrepancies to reconcile before relying on version numbers.** Records describe
`create-choir` as Edge v1 and `drive-manager-v2` around v14–v15; the live project reports v2 and
v19. `resend-inbound` v3 matches the 009 record. These are observations, not defects: Supabase
version counters increment per deploy, and no record claims exclusive ownership of those numbers.
Do not treat any of them as evidence of an undocumented deployment without checking the function's
history first.

### Vercel settings resolved — 7 September 2026 (read-only)

The owner pointed the Vercel connector at the right account. `list_teams` still returns an empty
list, but the account slug works as the team parameter, so the project is reachable. Read-only
calls only: `list_projects`, `get_project`, `list_deployments`, `get_project_deployment_protection`.
Nothing was deployed, promoted, rolled back, paused or reconfigured, and no environment variable
value was read.

| Question (CI proposal unknown 5) | Answer | How it was established |
|---|---|---|
| Which project serves the live web | `genova-app` (`prj_dhboa…`), Next.js, Node 24.x, domains include `app.genesinovachoir.com`, linked to GitHub `genesinovachoir/genova_app` | `list_projects`, `get_project` |
| Production branch | **`main`** | Every `target: production` deployment carries `githubCommitRef: main`, and the `…-git-main-…` branch alias exists |
| Current production revision | `0389242` — "007: canlı kanitlari kaydet" | Latest READY production deployment; it matches `origin/main` exactly, so production and the remote are in step and nothing newer has shipped |
| Are preview deployments enabled | **Yes** | Six deployments with `target: null` exist for `dependabot/*` branches and for `codex/003-tenant-cutover`. A branch push does build a preview |
| Are previews publicly reachable | **No** | `ssoProtection` is enabled with `all_except_custom_domains`, so previews sit behind Vercel Authentication while the custom production domain stays public. Password protection and trusted-IP rules are off |
| Preview environment values | **Still unread** | Reading variable values was neither needed nor attempted. A preview presumably receives the project's configured environment, so a preview of the 008 UI would talk to the live Supabase project |

**Effect on the routes.** Route B — branch push plus a draft pull request — now has an evidenced
risk profile rather than an assumed one: it triggers CI through `pull_request`, it does build a
Vercel preview, that preview is not publicly reachable, and production stays on `main` untouched.
Route A is unchanged and still wrong: pushing `main` would deploy the 008 UI to the public custom
domain with no migration or Edge function behind it.

**One caveat that survives.** A preview would still run against the live Supabase project, so no
preview should be used to exercise invitation flows before 010 deploys the backend. Reading a
preview page is safe; driving it is not.

**Side observations, not defects.** The dependabot preview for the grouped development-dependency
bump is in `ERROR` state, while the other five previews are `READY`; that is a dependency problem
in an unrelated open pull request, not something this brief touches. The successful Vercel builds
also confirm that Vercel supplies the environment `next build` needs — which is precisely what the
GitHub Actions `quality` job does **not** do, so the predicted CI build failure above still stands
and is not contradicted by Vercel's green builds.

**Remaining unknowns after this check:** whether GitHub Actions is enabled and whether any run has
ever passed, whether repository secrets exist, and whether `main` is branch-protected. Those live
in GitHub settings, which no connected connector exposes.


### CI run #19 result — 7 September 2026

The owner supplied a repository-scoped GitHub token so the agent could perform the remote steps
itself. Branch `ci/004-native-check` was pushed at `4e698f5` and draft pull request
[#7](https://github.com/genesinovachoir/genova_app/pull/7) opened into `main`. `main` was not
pushed, nothing was merged, and no deployment was promoted.

| Job | Result | Detail |
|---|---|---|
| `Native product checks` | **PASS** | `npm ci`, `npx tsc --noEmit`, `npm test`, `npm run bundle:check` all green. First remote proof that the native workspace, its lockfile and the Metro bundle build on a clean machine |
| `Browser regression` | **PASS** | `playwright install` and `pnpm test:e2e` green. This job builds the app through its own web server, with the synthetic environment `playwright.config.ts` supplies |
| `Quality and security` | **FAIL** | Failed at step 6, `Run pnpm check`, after `pnpm install --frozen-lockfile` succeeded. `pnpm audit` was skipped as a consequence |

**Resolved by this run:** GitHub Actions is enabled and the `pull_request` route works, closing two
of the previously unknown remote facts. The `mobile` job added in `dc5f7a6` is real and green.

**Not resolved, and not to be written up as if it were.** The proposal predicted that
`Quality and security` would fail at `next build` for missing Supabase environment. It did fail,
but **the predicted cause is unconfirmed**: the job's own log could not be retrieved, because
GitHub redirects log downloads to a storage host that the agent's egress proxy refuses, and the
check-run annotation carries only `Process completed with exit code 1`. The step ran roughly 90
seconds, which is arguably short for a full `next build`, so an earlier stage of
`pnpm check` — lint, typecheck, coverage or the service-worker check — cannot be excluded. A
prediction that matches an outcome is not a verified diagnosis.

**Next step for this criterion:** obtain the failing step's output, either from the owner opening
the run and pasting it or by another route to the log, and only then decide the fix. If it is the
environment, the change is a scoped workflow edit adding the variables that job needs, with the
synthetic-versus-secret choice made by the owner. If it is something else, the fix is different and
this criterion must not be closed by adding environment that was never the problem.

Draft PR #7 exists only to obtain this evidence and must not be merged: the branch carries the
undeployed 008 invitation UI. Close it and delete the branch once the criterion is settled.

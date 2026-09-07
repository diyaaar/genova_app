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
and Metro rows were rerun directly on macOS on 7 September at `10b6f9f`. Other PASS rows
retain their original evidence dates and limits; no device, web or live test was rerun.

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
| CI actually executed for this revision | yes | NOT RUN | no push or remote run is authorized in this session | Configuration alone is not a CI result; branch protection was neither checked nor changed |
| iOS development build runs on a device or simulator | yes | PASS | 6 Sep 2026, MACOS, `npx expo run:ios` | The project's own native iOS build was generated and launched on the iOS Simulator (iPhone 17 Pro, iOS 26.5); the app runs as Genova rather than inside Expo Go. Built locally with Xcode, no EAS and no spending. Limit: simulator only, no hardware |
| Android development build runs on a device or emulator | yes | PASS | 7 Sep 2026, `6d64d16`, direct macOS; Expo Android prebuild, Gradle ARM64 `assembleDebug`, adb install/launch on dedicated API 36 emulator | [Build, launch and UI evidence](004-android-build-2026-09-07.md): 160 tasks, own debug APK installed; signed-out screen and empty-form validation visually/XML verified. Synthetic loopback configuration, no real account/device. Initial disk/Metro connection failures resolved before acceptance |
| Real-phone scenario: sign-in → choir selection → sign-out with a real account | yes | NOT RUN | needs a device and a real account; real-account authority was explicitly withheld | A missing phone is not substituted by any local result |
| Live invitation/membership acceptance (010) available for the native flow | yes | NOT RUN | 010 stays pending: no live deployment authority and no Supabase MCP/CLI access in this session | See the 010 brief; nothing live was attempted |

**Optional progress: 23 passed / 27 required criteria.** Four required criteria are NOT RUN, so
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

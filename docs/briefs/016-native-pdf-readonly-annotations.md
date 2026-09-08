# 016 — Native PDF reading with read-only annotation overlays

Date: 2026-09-08. Status: local acceptance complete. Single writer: main agent.

## Outcome and authority

Deliver one locally verified native score-reading path: an authorized score file is downloaded to
app-private storage, each requested PDF page is rendered lazily to a bitmap, and schema-version-1
annotations visible through existing RLS are drawn read-only over that bitmap with the shared
coordinate contract.

The owner authorized local implementation, local commits, read-only live-state inspection and
repository gates. This package does not authorize push, deployment, migration, production-data
write or deletion, access to the real Genesi Nova choir, email, spending, or hardware testing.

## Start check

- Verified branch `main` at local HEAD `b2c3834`; recorded `origin/main` is `a13f696` and was not
  refreshed or changed. The only unrelated working-tree change is `supabase/.temp/cli-latest`,
  which remains unstaged and outside this package.
- Re-read the repository authority for this slice: [AGENTS](../../AGENTS.md),
  [handoff](../agent-handoff.md), [migration guide](../gecis-rehberi.md),
  [work cycle](../ai-calisma-duzeni.md), [package 013](013-native-repertoire-contract.md),
  [package 015](015-shared-protected-repertoire-file.md), [package 002](002-rn-pdf-spike.md),
  [delivery plan](../mobil-teslim-plani.md), [MIGRATION](../../MIGRATION.md) and the current
  memory-bank status.
- Revalidated the spike assets and implementation: the 40-page score SHA-256 is
  `39fcafaec0263d8c2429a66d4ea941180692a99749be398a1d48c8fd5397d6a3`; the renderer API is
  zero-based; app/database page numbers are one-based.
- Revalidated dependency compatibility from package metadata and package documentation:
  `@dariyd/react-native-pdf-page-image@2.0.0` requires RN 0.76+, New Architecture, iOS 15+ and
  Android API 24+; `@shopify/react-native-skia@2.6.2` supports the workspace's React 19 / RN
  0.86 and requires Reanimated 4 plus Worklets. The product workspace already targets Expo 57,
  RN 0.86.3 and New Architecture.
- Chrome remains open in the Genesi Nova profile. No external write or live product test belongs
  to this package.

## Scope

### Product and shared code

- Add a platform-independent defensive parser to
  `lib/repertuvar/annotation-types.ts`. It accepts only the five schema-version-1 item shapes,
  requires finite render-critical numbers, validates colors and identifiers, clamps normalized
  points, and reports skipped items rather than throwing.
- Make the web annotation reader use the same parser. Preserve its write behavior and public
  compatibility while surfacing skipped future-schema or malformed content as a non-blocking
  warning to the workspace.
- In `apps/mobile`, add:
  - score-file classification that accepts `file_type === 'sheet'` plus PDF MIME/name and rejects
    cover rows;
  - an authenticated ticket client for the package-015 Edge endpoint, an interruptible private
    download, file validation, and tenant-cache cleanup;
  - a small PDF-renderer adapter whose only page-number conversion maps one-based app pages to
    zero-based native indices;
  - a read-only annotation source using the authenticated Supabase client and existing RLS;
  - a reader gateway/state model and a catalogue-to-reader UI with explicit loading, empty,
    retry, expired/denied, corrupt, interrupted and render-error states;
  - lazy page rendering with bounded retained page images, cleanup on exit/choir switch, basic
    button zoom plus two-axis scrolling, and a Skia overlay for pen, highlighter, arrow and
    rectangle items plus native text overlays.
- Add the native dependencies and configuration proven by spike 002. Do not copy generated
  `ios/`, `android/`, build or cache output into Git.

### Tests and fixtures

- Shared parser tests cover every known item, malformed shapes, non-finite values, invalid colors,
  point clamping, unknown types and future schema versions.
- Native unit/component tests cover score selection, exact page-index conversion, ticket and
  download failures, interrupted cleanup, 40-page lazy/bounded rendering, corrupt/empty PDF,
  unknown/malformed annotation warnings, render retry, reader exit and choir-switch cleanup.
- The tracked synthetic 40-page PDF and annotation JSON are test-only fixtures copied from the
  accepted RN spike with their recorded hashes. No real choir file or account is used.
- Run root `pnpm check`; run mobile TypeScript, Jest and bundle export; run at least one local
  iOS simulator or Android emulator native build if the installed toolchain supports it.

## Behavior contract

### Selection and authorization

1. Only repository rows already returned by the active-choir catalogue are selectable.
2. A score candidate has `file_type === 'sheet'`, is PDF by MIME or `.pdf` name, and is not the
   `__cover__` row. Provider IDs and stored provider URLs are never treated as authorization.
3. The mobile client obtains the current session token and exchanges only the repository file UUID
   at the package-015 endpoint. A missing/expired session, denied ticket or invalid response fails
   closed with a retryable visible state.
4. The downloaded response must be a non-empty PDF. The private local filename is scoped by choir
   and repository file ID; incomplete temporary data is removed after interruption or failure.
5. Switching choir or signing out clears tickets, downloaded PDFs, rendered-page temporaries and
   annotation memory before another tenant can display them.

### Rendering and annotations

1. `toNativePdfPageIndex(pageNumber)` is the only one-based to zero-based conversion boundary. It
   rejects non-integer and sub-one input.
2. Visible pages render on demand. Only a three-page window remains in the JS result; before a
   later window is rendered, the native document is closed and reopened so the native module's
   generated-image temporaries cannot accumulate across a long score. Teardown closes it again.
3. Bitmap dimensions define the overlay coordinate space. Normalized annotation points are
   projected to the displayed page rectangle, preserving the spike's stroke, opacity, arrow,
   rectangle and text constants.
4. Only annotation rows with `schema_version === 1` are parsed. Future rows, unknown item types and
   malformed items contribute to an explicit non-blocking skipped-content warning and never crash
   or become writable.
5. Empty/no-sheet, corrupt/empty/large PDF, expired authorization, interrupted download, page
   render failure and choir change all have a visible state. A blank bitmap or stage is not PASS.

## Excluded

- Annotation creation, editing, deletion or sync writes.
- Audio/MIDI playback, offline user controls, persistent offline library, background downloads,
  thumbnails, double-page layout and advanced zoom/gesture behavior.
- Edge deployment, live provider download, live RLS/account acceptance or production evidence.
- Push/release, CI dispatch, store work, real users/content, hardware smoothness, keychain or the
  postponed real-phone flow.

## Acceptance

- [x] The shared defensive parser is used by both web and native reads, validates all known shapes,
  clamps normalized points, and reports skipped/future content without crashing.
- [x] Native selects only valid score PDFs, obtains an authorized ticket, downloads privately and
  removes incomplete or tenant-stale files; no provider URL becomes an authorization shortcut.
- [x] Native converts page numbers at one tested boundary, lazily renders the synthetic 40-page PDF
  to bitmaps, bounds retained pages, closes native temporaries and exposes corrupt/render failures.
- [x] Read-only RLS-backed annotation rows render over the correct page; unknown/malformed/future
  data is skipped with a visible non-blocking warning and no write path exists.
- [x] Catalogue → reader → catalogue and retry/empty/interruption/choir-cleanup flows pass component
  and pure tests without treating a blank page as success.
- [x] Root and mobile gates pass, the synthetic fixture matrix passes, and an available local
  simulator/emulator native build is recorded honestly.
- [x] Scope/diff, local links, documentation consistency and `git diff --check` pass; required
  FAIL or NOT RUN evidence remains visible and no external/hardware claim is inferred.

## Evidence

| Required criterion | Status | Evidence / limits |
|---|---|---|
| Shared parser and compatibility | PASS | 2026-09-08: root parser tests accept all five schema-v1 shapes, clamp finite normalized points and bounded widths, and count invalid IDs/colors/numbers, unknown types, excess content and future schemas as skipped. Both web and native reads call this parser; web now exposes skipped content without changing its write path. |
| Protected private download | PASS | 2026-09-08: native tests prove only an eligible repository score ID reaches the package-015 ticket seam; provider URLs are ignored. The app-private cache is scoped by choir/file UUID, downloads through `.part`, validates `%PDF-` and the 100 MB ceiling, and removes corrupt, oversized, interrupted and tenant-stale files. Missing session and invalid IDs fail closed. |
| PDF rendering and lifecycle | PASS | 2026-09-08: pure/gateway tests prove the only 1-based to 0-based boundary (`1` to `0`, `40` to `39`), edge/middle three-page windows and close/reopen between windows. The tracked PDF remains exactly 40 A4 pages, 65,905 bytes, PDF 1.4, SHA-256 `39fcafaec0263d8c2429a66d4ea941180692a99749be398a1d48c8fd5397d6a3`. Native-module behavior for this exact fixture was accepted in spike 002; this package separately compiled the product adapter but did not claim a new live/provider render. |
| Read-only annotation overlay | PASS | 2026-09-08: the source exposes only `load`, performs a file-ID-filtered SELECT through the signed-in client and existing RLS, and groups returned personal/shared layers by page. Fixture hash `329fb458f559ba7ea61db378ba4acdada3feb4b2756bef31833fc344044fea35` proves pages 1/2/40, nine known items and one skipped unknown. Component tests render the overlay and warning; no native mutation method exists. |
| Navigation, recovery and tenant cleanup | PASS | 2026-09-08: component tests cover catalogue to reader to catalogue, page navigation, 100–250% basic zoom, two-axis scrolling, authorization/open retry, render retry and nonblank success. Gateway/store tests cover close, tenant clear and invalidation of an in-flight open so stale content cannot return after cleanup. |
| Repository and mobile gates | PASS | 2026-09-08: mobile `npm run check` passed TypeScript plus 13 suites / 72 tests. `npm run bundle:check` produced a 1,314-module, 3.9 MB iOS Hermes bundle. `npx expo-doctor` passed 21/21. Root `pnpm check` passed lint, TypeScript, 37 files / 244 tests, service-worker syntax and the 17-page Next production build; measured coverage was 92.28% statements, 81.25% branches, 96.77% functions and 95.03% lines for the configured root scope. |
| Simulator/emulator build | PASS | 2026-09-08: `npx expo run:ios --device 698A4DDD-B26C-47E3-9624-1DD79974D7E2 --no-bundler` built and installed the product on an iPhone 17 Pro simulator. The build compiled PDF-page-image, Skia, Worklets, Reanimated and Expo FileSystem with zero errors and one duplicate-`-lc++` warning. No Metro/live account flow ran, so this is native build evidence only, not device or live-product acceptance. |
| Supplemental dependency audit | FAIL | 2026-09-08: `npm audit --omit=dev` exits 1 with 10 moderate findings in the Expo CLI/config to xcode to uuid chain and no high/critical finding. Its only complete automated remedy proposes the breaking downgrade `expo@46.0.21`; `--force` was not run. This supplemental audit was not defined as a required 016 closure gate, but the risk remains visible for a later dependency-maintenance package. |
| Commit, scope and document integrity | PASS | Planning commit `f7865e4` preceded product commit `0bbe646`; this evidence update is documentation-only. Nine changed Markdown files contained 100 local links and zero missing targets; targeted status-contradiction search and `git diff --check` passed. The unrelated `supabase/.temp/cli-latest` remains unstaged. |
| Live/provider/hardware acceptance | NOT RUN | Package 015's Edge function is not deployed, so authenticated live ticket/provider download, live RLS/product behavior and real-account performance are NOT RUN. Push, deploy, migration, live-data access, real choir access and hardware tests were neither authorized nor performed. 010 remains 6/7 and 004 remains 25/27. |

Local acceptance closes only package 016's required local criteria. It does not make the new
Edge/native path live and does not close the device pilot, package 010 or package 004.

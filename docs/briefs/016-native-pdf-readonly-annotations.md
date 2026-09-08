# 016 — Native PDF reading with read-only annotation overlays

Date: 2026-09-08. Status: active. Single writer: main agent.

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
  Android API 24+; `@shopify/react-native-skia@2.11.2` supports the workspace's React 19 / RN
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
  - lazy page rendering with bounded retained page images, cleanup on exit/choir switch, and a
    Skia overlay for pen, highlighter, arrow and rectangle items plus native text overlays.
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
2. The PDF is opened once for a reader session. Visible pages render on demand; only a small window
   remains mounted/cached and native temporary images are closed on teardown.
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

- [ ] The shared defensive parser is used by both web and native reads, validates all known shapes,
  clamps normalized points, and reports skipped/future content without crashing.
- [ ] Native selects only valid score PDFs, obtains an authorized ticket, downloads privately and
  removes incomplete or tenant-stale files; no provider URL becomes an authorization shortcut.
- [ ] Native converts page numbers at one tested boundary, lazily renders the synthetic 40-page PDF
  to bitmaps, bounds retained pages, closes native temporaries and exposes corrupt/render failures.
- [ ] Read-only RLS-backed annotation rows render over the correct page; unknown/malformed/future
  data is skipped with a visible non-blocking warning and no write path exists.
- [ ] Catalogue → reader → catalogue and retry/empty/interruption/choir-cleanup flows pass component
  and pure tests without treating a blank page as success.
- [ ] Root and mobile gates pass, the synthetic fixture matrix passes, and an available local
  simulator/emulator native build is recorded honestly.
- [ ] Scope/diff, local links, documentation consistency and `git diff --check` pass; required
  FAIL or NOT RUN evidence remains visible and no external/hardware claim is inferred.

## Evidence

| Required criterion | Status | Evidence / limits |
|---|---|---|
| Shared parser and compatibility | NOT RUN | Implementation and tests pending. |
| Protected private download | NOT RUN | Implementation and synthetic tests pending; Edge is not deployed. |
| PDF rendering and lifecycle | NOT RUN | Implementation, 40-page/corrupt fixtures and native build pending. |
| Read-only annotation overlay | NOT RUN | Implementation and tests pending; live RLS/product flow excluded. |
| Navigation, recovery and tenant cleanup | NOT RUN | Implementation and component tests pending. |
| Repository and mobile gates | NOT RUN | Root/mobile gates pending. |
| Simulator/emulator build | NOT RUN | Will run on an available local simulator/emulator; hardware remains excluded. |
| Live/provider/hardware acceptance | NOT RUN | Not authorized and cannot be inferred from local evidence. |

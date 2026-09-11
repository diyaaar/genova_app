# 032 — Permanent-WebView sensitive and platform capabilities

Prepared: 2026-09-11. Status: **READY FOR LOCAL EXECUTION**. Single writer and reviewer: main
agent; no independent review is claimed.

## Outcome and delivery focus

Complete the bounded native capability layer behind the accepted v1 permanent-WebView bridge:
present a native-only password-change sheet, copy an exact invitation link through the OS clipboard,
permit only a single gallery/file-provider image for accepted permanent-page inputs, and download a
validated protected file into an ephemeral native cache before an explicit open/save action. Every
request must return one stable result, fail visibly, and clean up without moving credentials or file
bytes through JSON bridge messages.

This closes package 032 only after the capability UI/services and their actual local iOS-simulator and
Android-emulator boundaries pass. It does not compose the complete 030 web peer with all permanent
routes; package 033 owns that C1 runtime. Hosted CSP/provider/real-account, hardware, release and final
manual assistive-technology acceptance remain separate gates.

## Starting evidence

- Work starts from local `main` at 031 record commit `93a0780`; the only observed unrelated change is
  the pre-existing `supabase/.temp/cli-latest`, which remains unowned and unstaged.
- [031](031-native-webview-shell.md) accepted the native shell at `0217ac8`: mobile 26 suites / 126
  tests, both exports, Expo Doctor 21/21 and exact Android API 36 arm64 plus iOS arm64-simulator Release
  builds passed. Password, clipboard and file requests deliberately return `capability-unavailable`.
- [The v1 contract](../webview-bridge-contract.md) keeps passwords native, accepts only an exact
  same-origin `/invite#invite=<64-hex-token>` clipboard value, forbids file bytes in bridge JSON, and
  requires URL/file-class revalidation, explicit file action, expiry/refusal and cache cleanup.
- The native `AuthStore` owns the persisted Supabase session and current user. Its gateway has
  `signInWithPassword` but not `updateUser`; same-user auth events currently re-resolve the shell and
  could dismiss a password sheet unless the ready tenant is preserved safely.
- Permanent web pages expose accepted image inputs only in profile edit and announcement rich text;
  both already reject non-images and files over 5 MiB. Other file types belong to future native routes
  or remain unavailable. The 031 injection currently disables every file input.
- React Native WebView 13.16.1 owns HTML file selection. Its guide says image accepts can offer camera
  intents; therefore Genova must not declare/request camera permission or add `capture`, and tests may
  claim gallery/file-provider success but not that every vendor chooser hides its external camera app.
- Expo SDK 57's bundled manifest and current references select `expo-clipboard ~57.0.1` and
  `expo-sharing ~57.0.18`. Sharing accepts a local file URL and opens the system action sheet. Existing
  `expo-file-system ~57.0.6` provides the ephemeral cache/download primitive.

## Allowed files and ownership

- `apps/mobile/package.json` and `package-lock.json` — Expo-selected Clipboard and Sharing only.
- `apps/mobile/src/auth/types.ts`, `auth-store.ts`, `AuthProvider.tsx`, doubles and focused tests — one
  native password change operation with validation, same-user ready-state preservation and no secret
  persistence/logging.
- `apps/mobile/src/webview/` and focused tests — capability controller hooks, gallery-only input policy,
  accessible password/file UI, clipboard adapter and protected-file ephemeral store/cleanup.
- `apps/mobile/src/ui/AppRoot.tsx` and focused tests — pass the native password owner into the shell.
- `apps/mobile/src/acceptance/` plus guarded local test support/evidence if needed — synthetic image and
  protected-file platform runtime only; no real user, provider or system external URL.
- `lib/mobile-webview-bridge.ts` and tests only if a reusable exported file-request validator is needed.
- `components/EmbeddedWebBridgeProvider.tsx`, invitations and focused tests only for stable native
  command success/failure/manual-copy feedback while keeping regular-browser behavior unchanged.
- This brief and, after the product commit, canonical status/evidence records in a separate commit.

No database, migration, Edge Function, Storage/provider, live data/account, camera/microphone
permission, generated `ios/` or `android/`, deployment or release file is allowed.

## Sources and existing patterns

- `AGENTS.md`, [transition guide](../gecis-rehberi.md), `docs/ai-calisma-duzeni.md`, the six
  `memory-bank/` indexes, `MIGRATION.md`, `KARARLAR.md` and
  [delivery plan](../mobil-teslim-plani.md) — authority, order and evidence rules.
- [Bridge contract](../webview-bridge-contract.md), [030](030-web-embedded-adapter.md) and
  [031](031-native-webview-shell.md) — exact message/tenant lifecycle and accepted peers.
- `app/(main)/profil/duzenle/page.tsx`, `components/invitations/InvitationManager.tsx`,
  `components/RichTextEditor.tsx`, `lib/server/drive-file-content.ts` and native protected-file code —
  preserved validations, active-content refusal and cleanup patterns.
- Official Expo SDK 57 [Clipboard](https://docs.expo.dev/versions/v57.0.0/sdk/clipboard/) and
  [Sharing](https://docs.expo.dev/versions/v57.0.0/sdk/sharing/) references; React Native WebView
  13.16.1 [file upload/download guide](https://github.com/react-native-webview/react-native-webview/blob/v13.16.1/docs/Guide.md)
  and installed native source; official Supabase JavaScript
  [`updateUser`](https://supabase.com/docs/reference/javascript/auth-updateuser) reference.
- Native UI rules retained from the selected design guidance: nonblank sheets, explicit cancel/retry,
  semantic labels/live states, minimum 48-point actions, visible disabled/pressed state and no
  motion-only feedback. Manual VoiceOver/TalkBack remains a separate layer.

## Migration start check

- Read instructions/evidence: sources above, current auth/WebView/shared policy/web call sites, actual
  installed WebView native file-picker source and Expo bundled-module versions.
- Single verifiable result: locally accepted **sensitive/platform capability layer** behind the 031
  shell, including actual bounded simulator/emulator API and picker/share-sheet behavior.
- Preserved behavior/contract: native remains the sole refresh/password owner; permanent forms stay
  web-owned; invitation text is already user-visible; protected bytes are temporary and never cross
  bridge JSON; existing auth/choir/repertoire/PDF/audio/mini-player behavior remains.
- Authority/files/writer: continuing local implementation covers dependencies, code, synthetic local
  runtime, tests and commits. Main agent is sole writer. No live Supabase, hosted page, real account/
  data, external URL launch, push/deploy/CI, hardware, spend or message authority is inferred.
- Tests/rollback/open limits: focused root/mobile tests, full affected gates, both exports, Expo Doctor,
  clean prebuild/native Release builds and guarded simulator/emulator capability runtime. Revert the
  product commit to restore 031's unavailable handlers. Package 033 composition and every hosted/
  hardware/provider layer remain NOT RUN.

## Required architecture and invariants

1. **Password never crosses the bridge.** The web request contains `{}` only. Native shows three
   secure fields, preserves required/current-password, minimum-eight-character, equality and changed
   password checks, reauthenticates the current email and calls `updateUser` through the native client.
   Fields are never persisted/logged and clear on success/dismissal/tenant loss. Same-user auth events
   update the session without dropping an otherwise server-confirmed ready tenant.
2. **Exact clipboard request.** The shared parser continues to accept only the configured-origin invite
   URL with a 64-hex fragment. Native writes only after the explicit web button action, never reads it
   in product code, never logs/caches it and reports `clipboard-written` or a stable failure so the
   still-selectable web field can be copied manually.
3. **Gallery/file-provider image only.** Accepted permanent inputs are single-file, no `capture` and no
   `multiple`, restricted to JPEG/PNG/GIF/WebP and at most 5 MiB. Unsupported inputs remain disabled.
   Cancellation, wrong type/size and focus recovery are visible. No camera permission or capture query
   is added; vendor chooser UI beyond the app permission boundary is reported, not guessed.
4. **Protected file is ephemeral.** Native revalidates canonical URL, filename and safe inactive MIME/
   extension, rejects HTML/SVG/XML/script or unknown active content, downloads once into a scoped cache,
   enforces a 50 MiB bound and opens the OS action sheet only after an explicit filename/type
   confirmation. 401/403/expired/5xx, cancellation, unavailable sharing and malformed content fail
   without a browser fallback.
5. **One operation, one result.** Replay/epoch/source guards remain first. Password/file duplicate
   requests return busy; clipboard completion is epoch-safe. Every accepted request gets at most one
   bounded `command.result`, containing no URL/query/token/password/file bytes/provider error.
6. **Cleanup wins.** File abort/dismiss/error/success, WebView clear/unmount, tenant/sign-out and process
   restart remove partial/final cache files and invalidate late callbacks. Closing a password sheet
   clears all three fields. No permanent download/cache is created in C1.
7. **No regression or permission expansion.** Regular-browser password/clipboard/file behavior remains.
   WebView auth/origin/storage/debug/navigation settings and native repertoire/audio/PDF ownership stay
   unchanged. Generated Android/iOS manifests must contain no camera, microphone or broad storage
   permission attributable to 032.

## Out of scope

- Completing all nine permanent routes against the 030 web build; hosted origin/CSP/provider/RLS,
  real-account password change or production file/clipboard operations. These belong to 033 or gated
  acceptance and remain explicitly NOT RUN.
- Camera capture, media-library write access, background downloads, permanent offline file storage,
  document management, arbitrary active-content viewing or rewriting permanent forms natively.
- Hardware chooser behavior, VoiceOver/TalkBack, real password-provider messaging, push/deploy/CI,
  store signing/review or any production data mutation.

## Risk, authority and rollback

- Highest risks are password leakage, same-user reauth tearing down the tenant shell, an invite token
  entering diagnostics, an expired URL opening an error body externally, active content executing, a
  partial file surviving clear, or a camera/storage permission appearing through configuration.
- Fail closed on invalid/busy/stale/unavailable requests. Capability failures keep the current verified
  WebView context unless tenant/session proof itself failed. Repeated test/runtime failure triggers
  diagnosis, never relaxed URL/MIME/cleanup checks.
- Rollback order is the later 032 code/test commit, then this planning commit. Generated projects and
  runtime files are deleted after evidence; the prior 031 unavailable behavior is the safe fallback.

## Small implementation steps

1. Add failing pure/auth/controller/component tests for password validation/reauth/update, exact
   clipboard success/failure, capability busy/result semantics, safe file class/size/status/abort/
   cleanup and input-policy denial.
2. Install exact Expo-selected Clipboard/Sharing dependencies. Implement small injectable adapters and
   the ephemeral file operation; wire controller request ownership before UI.
3. Add accessible password and protected-file sheets, accepted image-input policy and stable web
   feedback/manual-copy behavior. Keep secrets and raw request bodies out of diagnostics/tests.
4. Run focused/full mobile and affected root gates, both exports, Expo Doctor, dependency/config/secret
   review and exact Release compilation. Then run the guarded synthetic picker/clipboard/file action on
   iOS simulator and Android emulator; record actual versus unrun layers exactly.
5. Delete generated/runtime output, review diff/permissions/cleanup, commit product and acceptance
   records separately, and move to 033 only if every required 032 row passes.

## Definition of done

- [ ] Native password sheet validates locally, reauthenticates then updates through the native auth
  owner, preserves ready same-user context and clears fields without sending/logging secrets.
- [ ] Exact invitation URL clipboard write plus failure/manual fallback return stable bounded results;
  no product clipboard read or token logging/cache is introduced.
- [ ] Accepted image inputs are single-file JPEG/PNG/GIF/WebP, reject over 5 MiB/wrong type, recover
  after cancel and upload the exact synthetic image on both local Release platforms without Genova
  camera/microphone/broad-storage permission.
- [ ] Protected safe file view/download downloads exact local bytes, rejects active/oversize/expired/
  unauthorized responses, exposes explicit action/cancel/error and removes every partial/final file on
  both local Release platforms.
- [ ] Replay/epoch/tenant clear and duplicate-operation races cannot produce a second result or late
  side effect; command results and diagnostics contain no sensitive body.
- [ ] Full mobile gate, affected root gate, both exports, Expo Doctor, exact iOS/Android Release builds,
  dependency/config/secret/diff checks and guarded runtime evidence pass on final content.
- [ ] Canonical status/evidence records are committed separately; 004 remains 25/27 and 010 remains
  6/7, while composed/hosted/provider/hardware/release layers remain explicit NOT RUN.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 032 open. Review is self-review unless an independent review is
actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Password validations, current-email reauth, native update, same-user ready preservation and field cleanup work without a secret-bearing bridge/log/storage value | yes | **NOT RUN** | — | — |
| Exact invitation clipboard write/failure/manual-copy feedback is epoch-safe and never read, cached or logged by product code | yes | **NOT RUN** | — | — |
| Single accepted image, cancellation, wrong type, over 5 MiB and exact upload work on both local Release platforms with no Genova camera/microphone/broad-storage permission | yes | **NOT RUN** | — | — |
| Protected view/download confirmation, byte identity, safe-class/status/expiry/size refusal, cancellation and complete cache cleanup work on both local Release platforms | yes | **NOT RUN** | — | — |
| Duplicate/replay/clear/tenant races yield at most one redacted result and no late capability side effect | yes | **NOT RUN** | — | — |
| Existing auth/choir/WebView/repertoire/PDF/audio/mini-player and regular-browser behavior remains green | yes | **NOT RUN** | — | — |
| Full root/mobile gates, exports, Doctor, exact Release builds, dependency/config/permission/secret/diff review and generated/runtime cleanup pass | yes | **NOT RUN** | — | — |

## Delivery boundary

032 is not accepted until every required row above passes. If it closes, package 033 is the next ready
local task for the production-type web build composed with the native session, all nine permanent route
families and native exits on both Release simulator/emulator runtimes. Hosted/device acceptance remains
separate; keep 004 at 25/27 and 010 at 6/7.

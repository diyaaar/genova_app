# 019 — Actual iOS native PDF and Skia render acceptance

Prepared and executed: 2026-09-09. Status: **LOCAL ACCEPTANCE COMPLETE** at code/test
commit `2c64e5e`; this documentation-only commit records its evidence. Single writer: main agent.
This is the first bounded slice of delivery-plan A2.

## Outcome and delivery focus

Prove that the product's actual `PdfPageImage` and Skia adapters render the tracked synthetic
40-page score and its read-only annotations visibly inside the current iOS simulator. This closes
the native-output gap that 016's compile and mocked component tests could not close. It does not
claim the complete A2 service-to-device flow, Android output, hardware performance or live data.

## Execution start check

- [x] Read [AGENTS](../../AGENTS.md), [handoff](../agent-handoff.md),
  [migration guide](../gecis-rehberi.md), [work cycle](../ai-calisma-duzeni.md), the six
  memory-bank indexes, [MIGRATION](../../MIGRATION.md), [decisions](../../KARARLAR.md),
  [delivery plan A2](../mobil-teslim-plani.md#a--turn-the-existing-read-implementation-into-runtime-evidence),
  [016](016-native-pdf-readonly-annotations.md), [017](017-non-hardware-read-flow-acceptance.md)
  and [018](018-protected-file-runtime-acceptance.md).
- [x] Verified `main` at `538438a` after separate 018 code/evidence commits. Recorded
  `origin/main` remains `a13f696`; no refresh, push or deployment occurred. The only unrelated
  working-tree change is `supabase/.temp/cli-latest`, which remains unstaged and outside 019.
- [x] The main agent is the one writer. The owner's continuing instruction authorizes local
  implementation, simulator work, tests and required local commits. It does not resume postponed
  hardware tests or authorize live accounts/data, hosted calls, CI dispatch, push or deployment.
- [x] Current local target: Xcode exposes iOS 26.5 and a booted iPhone 17 simulator
  `9261A02F-8244-406A-872F-0FF8EFBFDBF2`. Generated `apps/mobile/ios/` exists and is ignored.
  The accepted fixture remains `apps/mobile/src/repertoire/__fixtures__/score_40p.pdf`; 016
  records its 40 pages, 65,905 bytes and SHA-256. Metro already includes `pdf` in `assetExts`.
- [x] Current product boundary: `nativePdfRenderer` calls the actual PDF-page-image native module;
  `AnnotationOverlay` calls actual Skia in a native build. Jest replaces both, and 016 only proved
  compilation/installation. Use a separate explicit acceptance entrypoint so the normal `App.tsx`
  and sign-in flow are not replaced or made conditional in release code.

## Allowed scope

- `apps/mobile/src/acceptance/`: an explicit, synthetic-only alternate entrypoint and its small
  helpers/tests. It may load only the tracked PDF/annotation fixtures and must identify itself on
  screen as acceptance mode.
- `apps/mobile/src/repertoire/pdf-renderer.ts`, `AnnotationOverlay.tsx`, `ScoreReaderScreen.tsx`
  and focused tests only for defects exposed by the actual native run.
- `apps/mobile/metro.config.js` or the mobile package files only if the existing PDF asset/native
  build cannot load, with the exact need recorded before editing. No dependency upgrade is planned.
- `docs/evidence/019-ios-native-pdf/`, this brief and minimal status/handoff indexes for sanitized
  screenshots and dated evidence. Generated `ios/`, `.expo/`, bundles and native image caches stay
  untracked.

## Excluded and preserved behavior

- No change to the default app entry, AuthProvider, catalogue, protected-file authorization,
  shared annotation schema, web reader, DB, Edge function or permanent WebView ownership.
- No hosted Supabase/Drive call, real user or choir data, push, deploy, migration, email, spending,
  remote CI, physical device, keychain or real-phone test.
- 019 does not close A2, M1, 004 or 010. The next slice must prove Android plus the actual
  018-protected service/gateway, retry, exit, tenant switch and private-file cleanup boundaries.

## Implementation and verification sequence

1. Freeze fixture hashes, simulator identity, app bundle identifier and the alternate-entry build
   command. Refuse an unexpected device or non-synthetic input.
2. Add a visibly labeled alternate entry that resolves the bundled PDF asset, calls the actual
   native `open`/`generate`/`close` adapter and renders the actual Skia overlay. Provide direct
   page 1, 20 and 40 selection plus bounded zoom controls so evidence does not depend on repeated
   taps or a mocked gateway.
3. Display sanitized diagnostics required for acceptance: selected page, returned page count,
   generated image dimensions, zoom and cleanup state. Never display a token, path containing
   personal data or provider identifier.
4. Build/install the current product native project with the alternate entry on the named
   simulator. Capture pages 1, 20 and 40 plus an annotated zoom state; inspect every image rather
   than treating a launch, testID or file existence as visual proof.
5. Exercise close/reopen and a controlled invalid-page/render failure without weakening the normal
   product path. Confirm generated images are no longer retained after exit/close as far as the
   native module's documented surface can observe; label deeper native cache behavior unverified.
6. Run `npx tsc --noEmit && npm test` in `apps/mobile`, plus the iOS native build used above.
   Run root `pnpm check` only if shared/root code changes. Review diff and generated-file status.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 019 open. All review is self-review unless an independent
review is actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Alternate acceptance entry is explicit, synthetic-only and leaves default product entry/flow unchanged | yes | PASS | 2026-09-09, `2c64e5e`; alternate `ENTRY_FILE` Release build | One acceptance file registers its own root and loads only tracked fixtures. The screen labels itself synthetic. `App.tsx`, `index.ts` and app configuration have no 019 diff; the normal `index.ts` bundle export passed after the alternate build. |
| Actual native PDF module opens exactly 40 pages and visibly renders nonblank, distinct pages 1, 20 and 40 | yes | PASS | 2026-09-09, iPhone 17 / iOS 26.5 simulator | Actual `PdfPageImage` returned page count 40 and 1190 x 1684 images. Pixel inspection found the distinct page labels and grids in [pages 1, 20 and 40](../evidence/019-ios-native-pdf/README.md#pixel-inspection). This is simulator/synthetic evidence, not hardware or service integration. |
| Actual Skia overlay visibly matches fixture annotations on pages 1 and 40 at base and zoomed layout | yes | PASS | 2026-09-09, actual Skia Canvas/Path/Text overlay | Page 1 visibly showed all expected annotation kinds at their normalized grid positions. Page 40 showed the expected rectangle/note; at 150% the PDF and overlay scaled together without coordinate drift in the inspected viewport. |
| Page selection, bounded zoom, close/reopen and controlled render failure remain usable | yes | PASS | 2026-09-09, acceptance controls and actual adapter | Direct 1/20/40 selection, 100/150% zoom, invalid user page 41 refusal, close, generated-file deletion and reopen all passed. The returned file URI ceased to exist and the app temp directory was empty after close. Deeper OS/native caches are not observable or claimed. |
| Mobile TypeScript/Jest and the actual iOS native build/install pass | yes | PASS | 2026-09-09, `2c64e5e`; mobile check, bundle and Release build | `npm run check`: 14 suites / 73 tests. Normal iOS export: 1,314 modules. Alternate-entry Xcode Release build: zero errors, two warnings; installed and opened on the named simulator. Root gate N/A because no root/shared code changed. Simulator is not hardware. |
| Captures/hashes, scope, local links, status consistency and `git diff --check` pass | yes | PASS | 2026-09-09, documentation review | Seven 1206 x 2622 PNG captures were inspected and hashed in the [evidence index](../evidence/019-ios-native-pdf/README.md). Generated `ios/` and `.expo/` outputs remained ignored. Local links and status records passed their checks; the unrelated CLI cache remained unstaged. |
| Separate code/evidence commits and next-task handoff preserve 004/010/018 boundaries | yes | PASS | 2026-09-09, code `2c64e5e`; this evidence commit | Product acceptance source and records are separate commits. No push, deploy, hosted call, real data/account, remote CI or hardware action occurred. 004 remains 25/27; 010 remains 6/7; 018 remains local-only. The next brief owns Android plus actual 018 local-service lifecycle integration. |

## Rollback, stop conditions and next slice

Rollback is the 019 code commit followed by its evidence commit; generated native output is
regenerated, not hand-edited. Stop rather than bypass if the alternate entry would affect normal
startup, the fixture is not exact, the simulator target changes unexpectedly, a native dependency
requires a broad upgrade, or visible output cannot be inspected. Two failed approaches require a
recorded diagnosis and replan.

019 closes only the actual iOS-render slice. The next A2 brief owns Android emulator output and
the actual 018 local-service gateway/lifecycle acceptance on both local platforms. It must cover
retry, exit, tenant switch and private-file cleanup without reclassifying the 019 fixture-only
screen as service integration. 004 hardware remains postponed and 010 fixture recreation remains
separately gated.

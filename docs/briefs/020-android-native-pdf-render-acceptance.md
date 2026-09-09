# 020 — Actual Android native PDF and Skia render acceptance

Prepared and executed: 2026-09-09. Status: **LOCAL ACCEPTANCE COMPLETE** at code/test commit
`e2fe177`; this documentation-only commit records its evidence. Single writer: main agent. This is
the second bounded slice of delivery-plan A2.

## Outcome and delivery focus

Prove that the product's actual `PdfPageImage` and Skia adapters visibly render the tracked
synthetic 40-page score and read-only annotations inside the current Android emulator. Reuse the
019 acceptance behavior without duplicating its implementation or changing the default app entry.
This closes only the Android native-output half of A2; a following brief must integrate the actual
018 local service with retry, exit, tenant-switch and private-file lifecycle behavior on both local
platforms.

## Execution start check

- [x] Read [AGENTS](../../AGENTS.md), [handoff](../agent-handoff.md),
  [migration guide](../gecis-rehberi.md), [work cycle](../ai-calisma-duzeni.md), the six
  memory-bank indexes, [MIGRATION](../../MIGRATION.md), [decisions](../../KARARLAR.md),
  [delivery plan A2](../mobil-teslim-plani.md#a--turn-the-existing-read-implementation-into-runtime-evidence),
  [018](018-protected-file-runtime-acceptance.md) and [019](019-ios-native-pdf-render-acceptance.md).
- [x] Verified `main` at `abaa671` after separate 019 code/evidence commits. Recorded
  `origin/main` remains `a13f696`; no refresh, push or deployment occurred. The only unrelated
  change is `supabase/.temp/cli-latest`, which remains unstaged and outside 020.
- [x] The main agent is the one writer. The owner's continuing instruction authorizes local
  implementation, emulator work, tests and required local commits. It does not resume physical
  hardware or authorize live accounts/data, hosted calls, CI dispatch, push or deployment.
- [x] Current local target is the task-owned `genova004_api36` AVD: Pixel 7 profile, Android 16 /
  API 36, arm64-v8a, no existing process/session. SDK and emulator are under
  `/opt/homebrew/share/android-commandlinetools`; Homebrew OpenJDK 17.0.20 is available at
  `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`. Hypervisor acceleration passes,
  27 GiB is available, and the AVD's earlier accepted boot used port 5580 with a bounded 2 GiB
  partition because its default userdata request exceeded available space.
- [x] Frozen fixtures remain exact: `score_40p.pdf` is 65,905 bytes with SHA-256
  `39fcafaec0263d8c2429a66d4ea941180692a99749be398a1d48c8fd5397d6a3`; annotation JSON SHA-256 is
  `329fb458f559ba7ea61db378ba4acdada3feb4b2756bef31833fc344044fea35`. The generated Android project
  exists and is ignored. The current Android native adapter renders through `PdfRenderer`, writes
  page images to app cache, and deletes tracked generated images on `close()`.
- [x] **2026-09-09 asset-resolution finding and scope expansion:** the first corrected Release
  build succeeded, installed and launched the platform-accurate acceptance entry, but actual
  `open()` returned `ENOENT`. Pixel/UI evidence showed the Android bundle asset URI was not a
  directly readable filesystem path; the native PDF module supports content/file/http/data input,
  not Android embedded-resource paths. The app already links Expo Asset `57.0.16` transitively.
  Add that exact SDK-matched package as a direct mobile dependency and have the acceptance harness
  copy its bundled fixture to a local cache URI before native `open()`. This is acceptance fixture
  preparation, not a live/provider fallback or a change to product private-file handling. The
  earlier absolute `ENTRY_FILE` attempt also failed before assembly because Android expects a
  project-relative entry; the corrected command uses `src/acceptance/native-pdf.tsx`.

## Allowed scope

- `apps/mobile/src/acceptance/`: factor the 019 UI into one platform-neutral synthetic acceptance
  component with tiny platform entrypoints if required. Default `App.tsx` and `index.ts` remain
  unchanged and unconditional.
- `apps/mobile/package.json` and `package-lock.json`: add only exact Expo Asset `57.0.16`, already
  installed/transitively linked by Expo, so the acceptance harness can use its public local-asset
  API. No other dependency or generated native configuration change is allowed.
- Focused repertoire adapter/overlay files and tests only for a defect reproduced by the actual
  Android run. A native module patch or dependency replacement requires a recorded scope expansion.
- `docs/evidence/020-android-native-pdf/`, this brief and minimal status/handoff indexes.
  Generated Android, APK, Gradle, Expo and emulator output remain ignored.

## Excluded and preserved behavior

- No 018 service/client integration, Auth, tenant switch, protected HTTP route, secure storage,
  web behavior, shared schema, DB, Edge function or permanent WebView ownership change.
- No hosted Supabase/Drive call, real account/choir data, push, deployment, migration, email,
  spending, remote CI, physical device or real-phone test.
- 020 does not close A2, M1, 004 or 010. It preserves 019's accepted iOS evidence; any shared
  acceptance-code refactor requires a focused iOS regression run as well as Android proof.

## Implementation and verification sequence

1. Refuse a running unknown Android target; boot only `genova004_api36` on the recorded serial and
   confirm API/ABI/profile. Use process-local Java/SDK settings, `EXPO_NO_DOTENV=1` and synthetic
   loopback public configuration so no live endpoint or account is used.
2. Reuse the explicit 019 synthetic acceptance behavior with accurate platform labeling and no
   default-entry change. Resolve the bundled PDF asset through the actual Release build.
3. Build/install a current arm64 Android Release or production-equivalent local build with the
   alternate entry. Capture and inspect pages 1, 20 and 40 plus a 150% annotated state.
4. Exercise user page 41 refusal, close cleanup and reopen. Check the returned rendered URI and
   the app cache through Android's debuggable inspection surface where available. Record any
   source-copy/cache limitation rather than assuming complete cleanup.
5. Run `npm run check`, normal Android bundle/export and the actual Android native build. If the
   shared acceptance component changes, rerun the 019 iOS alternate-entry build/launch or retain
   the affected row open. Root `pnpm check` is required only for root/shared code changes.
6. Inspect every capture, hashes, app crash log, owned diff and ignored/generated status. Stop the
   emulator after evidence; do not delete the reusable AVD or SDK.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 020 open. All review is self-review unless an independent
review is actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Acceptance entry is synthetic/platform-accurate and default product entry remains unchanged | yes | PASS | 2026-09-09, `e2fe177`; alternate `ENTRY_FILE` Release builds | 019's entry was renamed/generalized and labels `Platform.OS`; it loads only tracked fixtures. `App.tsx`, `index.ts` and app configuration have no 020 diff. Normal Android `index.ts` export passed independently. |
| Actual Android PDF module opens exactly 40 pages and visibly renders distinct pages 1, 20 and 40 | yes | PASS | 2026-09-09, `genova004_api36`, Android 16/API 36 arm64 | Actual Android `PdfRenderer` returned 40 pages and 1190 x 1684 page images. The [inspected captures](../evidence/020-android-native-pdf/README.md#pixel-inspection) show distinct `SAYFA 1`, `20` and `40` content. Expo Asset prepares the tracked fixture as a local file; this is not service/provider integration. |
| Actual Android Skia overlay visibly aligns on pages 1 and 40 at base and 150% zoom | yes | PASS | 2026-09-09, actual Android Skia Canvas/Path/Text overlay | Page 1 showed all expected shapes/text at normalized grid positions. Page 40 showed the expected rectangle/note; at 150% the bitmap and overlay scaled together in the inspected scroll viewport. |
| Invalid page, close cleanup and reopen behave safely without app crash | yes | PASS | 2026-09-09, actual adapter plus Android accessibility/pixel checks | User page 41 was refused; `close()` made the generated-image URI nonexistent; reopen returned 40 pages and regenerated page 40. Crash log was empty. Release `run-as` was refused because the app is not debuggable, so deeper cache state is unverified. The public synthetic Expo Asset cache is not private-file cleanup. |
| Mobile TypeScript/Jest, normal Android bundle and actual native build/install pass; affected iOS acceptance regresses cleanly | yes | PASS | 2026-09-09, `e2fe177` | Mobile: 14 suites / 73 tests. Normal Android export: 1,312 modules. Android Release: 421 actionable tasks, installed/launched; 40 MiB APK SHA is in evidence. iOS alternate-entry Release rebuild: zero errors/two warnings, installed/launched and page 1/40 visually present. Root gate N/A: no root/shared source changed. |
| Captures/hashes, scope, local links, status consistency and `git diff --check` pass | yes | PASS | 2026-09-09, documentation review | Eight 1080 x 2400 PNGs, including the retained runtime failure, were inspected and hashed in the evidence index. Generated Android/iOS/Expo output stayed ignored; local links and status records passed; unrelated CLI cache stayed unstaged. Supplemental audit remains FAIL at the known 10 moderate Expo toolchain findings; force downgrade was refused. |
| Separate code/evidence commits and next-task handoff preserve 004/010/018/019 boundaries | yes | PASS | 2026-09-09, code `e2fe177`; this evidence commit | Product/dependency source and records are separate. No push, deploy, hosted call, real account/data, remote CI or hardware action occurred. 004 remains 25/27; 010 remains 6/7; 018–020 remain local-only. The next brief owns actual 018 service-to-client lifecycle integration. |

## Rollback, stop conditions and next slice

Rollback is the 020 code commit followed by its evidence commit; generated output is regenerated,
not hand-edited. Stop rather than bypass if the target is not the dedicated AVD, actual module
output cannot be inspected, fixture loading would require a live endpoint, shared refactoring
breaks 019, or a broad native/dependency change is needed. Two failed approaches require a
recorded diagnosis and replan.

020 closes only the actual Android-render slice. Open the next A2 brief for the actual 018
local-service gateway and lifecycle on both
local platforms: ticket/file retrieval, retry, exit, tenant switch and private-file cleanup. The
019/020 fixture-only screens cannot close that integration. 004 hardware remains postponed and
010 fixture recreation remains separately gated.

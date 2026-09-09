# 020 Android native PDF/Skia evidence

Captured and visually inspected on 2026-09-09 from code/test commit `e2fe177`. The target was the
task-owned `genova004_api36` AVD on serial `emulator-5580`: Pixel 7 profile, Android 16 / API 36,
arm64-v8a. Bundle ID was `com.genesinovachoir.genova`. The screen labels itself synthetic Android
acceptance mode and loads only the tracked 40-page PDF and annotation fixtures.

## Frozen inputs, build and gates

- PDF: 65,905 bytes; SHA-256
  `39fcafaec0263d8c2429a66d4ea941180692a99749be398a1d48c8fd5397d6a3`.
- Annotation JSON SHA-256:
  `329fb458f559ba7ea61db378ba4acdada3feb4b2756bef31833fc344044fea35`.
- Process-local build settings disabled dotenv and supplied synthetic loopback public values.
  Alternate-entry command used `ENTRY_FILE=src/acceptance/native-pdf.tsx` with
  `npx expo run:android --variant release --device genova004_api36 --no-bundler`.
- Final Android Release assembly passed with 421 actionable tasks, installed and opened on the
  named AVD. APK size was 40 MiB; SHA-256
  `c44b1d0ae2535bf5289099e3438f73ab5b3a4ea8c006f50a4d6bd77d24a262dd`.
- Mobile TypeScript/Jest passed 14 suites / 73 tests. A normal Android `index.ts` export passed
  with 1,312 modules. Because 020 refactored the accepted fixture harness, the iOS alternate-entry
  Release build was also rerun: zero errors, two warnings, installed on the same iPhone 17 / iOS
  26.5 simulator and visibly returned page 1/40 at 1190 x 1684 with its annotations.
- `npm audit --omit=dev --audit-level=moderate` retains the previously recorded 10 moderate Expo
  toolchain findings through `uuid`/`xcode`. Its offered force fix would downgrade Expo 57 to 46,
  so it was not applied. Direct Expo Asset 57.0.16 matches the already installed transitive SDK
  version and did not add another advisory chain.

## Pixel inspection

| Capture | SHA-256 | Observed result |
|---|---|---|
| [asset-uri-enoent-failure.png](asset-uri-enoent-failure.png) | `7859de478189202da6674a6e77cd1334006cc7de8a0e162c1043197f67783538` | First successful Release launch exposed `ENOENT`: the Android embedded asset URI was not a native-readable file path. This is retained failure evidence, not acceptance. |
| [page-01.png](page-01.png) | `c5adf1cecf707b89746aeacee25ea5c669f667ba40ee3d56b16d400ebdd99a7a` | After Expo Asset copied the tracked fixture to local cache, actual Android PDF output was nonblank at 1190 x 1684. All page-1 Skia shapes/text visibly align to the normalized grid. |
| [page-20.png](page-20.png) | `58ad6561020c1efc29539f04db12048fa7c087a95b897486506c32ad858d2f95` | Distinct middle page marked `SAYFA 20`, nonblank and without fixture annotations. |
| [page-40.png](page-40.png) | `d836270464c5f08f5af7f9fa7bc63b0230eb7be6f48654307ffbd4452252643e` | Distinct last page marked `SAYFA 40`; cyan rectangle and red note visibly match expected positions. |
| [page-40-zoom-150.png](page-40-zoom-150.png) | `d2cbcb81f1a31c76c033ef99a6d5a50f0cabb203590ce941fb8e37bcf0d159e6` | At 150%, PDF grid, rectangle and note scale together and remain aligned in the scrollable viewport. |
| [invalid-page-refused.png](invalid-page-refused.png) | `032c54ecbcd1b5997e99ba7d143bf58d7577439c85edcfd0735ec44aa5fa20a3` | Native zero-based index 40, user page 41, is refused and displayed as PASS without replacing page 40. |
| [close-cleanup-pass.png](close-cleanup-pass.png) | `ec416234790b9a82fe4e1f3988231570bf98e5291e9f53a46e9e373a43bb948e` | `close()` makes the generated image URI cease to exist; page 41 refusal remains visible. |
| [reopen-page-40.png](reopen-page-40.png) | `2403a60d8fe1c16be645fbb1de46d79bc0ae28275df13235a5c4331640d0b482` | Reopen returns page count 40 and regenerates page 40 at 1190 x 1684 after cleanup. |

## Failures and limits

The first build attempt used the iOS-style absolute `ENTRY_FILE`; Android Gradle prepended the
project root and refused the nonexistent doubled path before assembly. The corrected relative
entry built and launched, exposing the embedded-asset `ENOENT`. After reassessment, the harness
used the public Expo Asset API already present in the SDK to create a local file URI; no native
module, provider or product private-file path was changed.

The Release app is intentionally not debuggable, so Android `run-as` could not inspect its private
cache. Cleanup is proven only for the native renderer's returned generated-image URI. The Expo
Asset copy of the public synthetic fixture is expected to remain cacheable; deeper OS/native cache
state and real protected-file cleanup are not claimed. This is local emulator self-review, not
018 service integration, Android/iOS hardware, secure storage, Drive, real account, hosted routing,
remote CI or production performance. No push, deployment or external data action occurred. The
reusable AVD was stopped after capture and not deleted.

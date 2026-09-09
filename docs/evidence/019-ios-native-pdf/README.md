# 019 iOS native PDF/Skia evidence

Captured and visually inspected on 2026-09-09 from code/test commit `2c64e5e`.
The target was the local iPhone 17 simulator on iOS 26.5,
`9261A02F-8244-406A-872F-0FF8EFBFDBF2`, running bundle
`com.genesinovachoir.genova`. The screen labels itself synthetic acceptance mode; it uses the
tracked 40-page PDF and annotation fixtures only.

## Frozen inputs and build

- `score_40p.pdf`: 65,905 bytes; SHA-256
  `39fcafaec0263d8c2429a66d4ea941180692a99749be398a1d48c8fd5397d6a3`.
- `annotations.sample.json`: SHA-256
  `329fb458f559ba7ea61db378ba4acdada3feb4b2756bef31833fc344044fea35`.
- Alternate-entry Release build/install:
  `ENTRY_FILE="$PWD/src/acceptance/native-pdf-ios.tsx" npx expo run:ios --configuration Release --device 9261A02F-8244-406A-872F-0FF8EFBFDBF2 --no-bundler`.
- Xcode completed with zero errors and two warnings, installed the Release simulator app and
  opened it. The rendered screen proved the alternate entry was bundled. The normal entry was
  then independently exported with `npm run bundle:check` from `index.ts`; `App.tsx`, `index.ts`
  and app configuration have no 019 diff.
- Mobile gate: `npm run check` passed 14 suites / 73 tests; the normal iOS export passed with
  1,314 modules. The root gate was not required because no root/shared source changed.

## Pixel inspection

| Capture | SHA-256 | Observed result |
|---|---|---|
| [page-01.png](page-01.png) | `65f5ff1c6234e176d3779695cbd341c3a126dd8dc1897578b859482a16e568ad` | Nonblank page 1 at 1190 x 1684. Red freehand, yellow highlight, green rectangle, black arrow and text note visibly align with the normalized coordinate grid. |
| [page-20.png](page-20.png) | `3f920ca650da0ed4b3157de35cccb280c60c44bdbba3261dacfaba898b1792b3` | Distinct nonblank middle page, marked `SAYFA 20`, at 1190 x 1684 with no fixture annotation on this page. |
| [page-40.png](page-40.png) | `82cef58f4343fb32a27065aef546858c998ed232589b6851274025b19ad86caa` | Distinct last page, marked `SAYFA 40`; cyan rectangle and red last-page note are visible at the expected normalized positions. |
| [page-40-zoom-150.png](page-40-zoom-150.png) | `27dfdaf0d43da939f97ba1d8c52450187ee41e9670ffc4e424ce0e32cc7c1a2b` | At 150% the bitmap, rectangle and text scale together and remain aligned; the nested viewport is scrollable. |
| [invalid-page-refused.png](invalid-page-refused.png) | `2cbb37df6d09c6da1ce02ad5aeae72a301e46e4915c9342096f1e0613d252625` | Actual native request for zero-based index 40, user page 41, is refused and displayed as PASS without replacing the valid page. |
| [close-cleanup-pass.png](close-cleanup-pass.png) | `4088d1940afa001fc79d473098fd73aa652427961b92d185b4422866fcab41ad` | `close()` removes the generated image observed through Expo FileSystem; the module's app `tmp` directory contained no file after close. |
| [reopen-page-40.png](reopen-page-40.png) | `d8fc56678852411481596b16d9a2a02d7f48202d08c90bf7063e7fc617487c5f` | Reopen returns page count 40 and regenerates page 40 at 1190 x 1684 after cleanup. |

## Limits

This is local self-review on a simulator. It proves actual iOS PDF-page-image and Skia output for
tracked synthetic assets, not Android, real hardware, secure-storage durability, the 018 service
gateway, Drive, a real account, hosted routing or production performance. `close()` was observed
through the returned file URI and app temporary directory; unobservable OS/native caches were not
claimed. No push, deployment, remote CI or external data action occurred.

# 004 Android development build — 7 September 2026

Source revision: `6d64d1677c82b95611ec4141b7a22edf1a169f1e` (`main`).
Main agent, direct macOS execution; dedicated emulator only. No real account, phone,
production endpoint, push or paid service is authorized by this work.

## Environment and reproducibility

macOS 26.5.1 / Darwin arm64; Node v24.13.1, npm 11.8.0. Existing Homebrew
OpenJDK 17.0.20 and SDK under `/opt/homebrew/share/android-commandlinetools`.
Existing SDK 36, build tools 36.0.0, NDK 27.1.12297006 and CMake 3.22.1 match
the installed React Native version catalog. Android Studio is not installed.
The emulator acceleration check returned exit 0: `Hypervisor.Framework OS X Version 26.5`.

SDK discovery is a correction to the earlier conventional-path-only check; no SDK/JDK
reinstall was needed. Only the missing emulator and API 36 ARM64 Google APIs system image
were requested. Existing accepted SDK licenses were reused. The command-line SDK tools
warn that `sdkmanager`/`avdmanager` are deprecated; their documented interfaces remain usable
in the installed package. No general SDK update or global shell-profile edit was performed.

References consulted: [SDK package commands](https://developer.android.com/tools/sdkmanager),
[AVD creation](https://developer.android.com/tools/avdmanager), and
[emulator startup](https://developer.android.com/studio/run/emulator-commandline).

Process-local environment for prebuild/build/Metro:

```sh
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export CI=1 EXPO_NO_DOTENV=1 EXPO_OFFLINE=1
export EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export EXPO_PUBLIC_SUPABASE_ANON_KEY=genova-local-build-only
```

The URL/key above are synthetic local test settings, not credentials. The owner's `.env`
is not loaded or modified. The new emulator has no prior app/account state. This setup
allows app initialization and the signed-out screen, not live membership acceptance.

Commands (working directory indicated):

```sh
# Existing SDK manager, additive install only
sdkmanager --sdk_root=/opt/homebrew/share/android-commandlinetools 'emulator' 'system-images;android-36;google_apis;arm64-v8a'
# apps/mobile
npx expo prebuild --platform android --no-install
# apps/mobile/android
./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --console=plain --max-workers=2
# apps/mobile, separate process
npx expo start --lan --port 8081
```

Prebuild succeeded and reported `package.json | no changes`. Generated `android/` is
ignored and not hand-edited. It warned that automatic system UI requires `expo-system-ui`;
no dependency was added, and this run does not claim automatic theme behavior.

## Result

**PASS — Android development build and emulator launch.** `assembleDebug` exited 0:
`BUILD SUCCESSFUL in 3m 35s`, 160 tasks executed. ARM64 debug APK: 44 MB,
SHA-256 `ae37ef12d72d12db85c45ed1a112c47799ade19d806165717776f2dafd986595`.
Generated path: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` (ignored).

AVD `genova004_api36`, Pixel 7 profile, Android 16 / API 36 / arm64-v8a,
serial `emulator-5580`. Installed with `adb -s emulator-5580 install <apk>`: Success.
`am start -W -n com.genesinovachoir.genova/.MainActivity`: Status ok, COLD launch.
Metro then reported `Android Bundled 3057ms index.ts (799 modules)`.

Direct UI inspection and XML assertions confirmed Genova, the email/password fields,
and the sign-in button. Tapping the button with both fields empty displayed
`E-posta ve parola gerekli.` while retaining the login screen. No credentials were entered
or submitted. The app process remained alive (PID 5193), and `logcat -d -b crash` was empty
at acceptance. This is supporting smoke evidence, not authenticated workflow acceptance.

- [Signed-out screen](../evidence/004-android-2026-09-07/sign-in.png)
- [Empty-form validation](../evidence/004-android-2026-09-07/empty-form.png)
- [Initial UI hierarchy](../evidence/004-android-2026-09-07/sign-in.xml)
- [Validation UI hierarchy](../evidence/004-android-2026-09-07/empty-form.xml)

## Failures diagnosed before acceptance

1. `avdmanager create avd -n genova004_api36 -k 'system-images;android-36;google_apis;arm64-v8a' -d pixel_7`
   returned exit 0 with missing `devices.xml` diagnostics. The AVD was actually created;
   `emulator -list-avds` confirmed it. No SDK file was fabricated or edited.
2. First emulator boot failed: default userdata required 12288 MB, only 9714 MB available.
   Retried this task-owned AVD with the documented `-partition-size 2048` runtime option:
   boot succeeded (`sys.boot_completed=1`). No unrelated files were deleted.
3. Initial app launch showed `Unable to load script`. The first Metro used port 8088;
   the next attempt on 8081 still bound only IPv6 loopback (`lsof`: `[::1]:8081`), and
   IPv4 `curl` / emulator connectivity failed. Starting Metro with `--lan --port 8081`
   made `http://127.0.0.1:8081/status` return `packager-status:running`. With
   `adb -s emulator-5580 reverse tcp:8081 tcp:8081`, force-stop/relaunch loaded the JS
   and produced the verified UI. This was environment connectivity, not a source fix.
4. Expo CLI's optional existing-binary launch expects the AVD name, not its adb serial;
   `--port` and `--no-bundler` cannot be combined. The corrected invocation succeeded:
   `npx expo run:android --device genova004_api36 --binary android/app/build/outputs/apk/debug/app-debug.apk --no-bundler --no-install`.

Emulator command used for successful boot:

```sh
/opt/homebrew/share/android-commandlinetools/emulator/emulator -avd genova004_api36 -port 5580 -partition-size 2048 -no-snapshot -no-audio -no-boot-anim -no-window -memory 2048
```

Only this task's Metro/emulator processes are stopped after evidence capture. The additive
SDK packages, dedicated AVD and ignored generated build remain for reuse. No global shell
profile or product source changed. Gradle/third-party deprecation warnings and the prebuild
system-UI warning remain; this run does not establish full Android feature parity.

## Acceptance boundary

Only the Android-build criterion changes to PASS: 23/27 required criteria now PASS.
Hardware keychain, real-phone real-account flow, remote CI and live 010 remain NOT RUN.
No repertoire/PDF work may start before 004 acceptance. The mandatory table remains in the
[004 brief](004-rn-kabuk-ve-giris.md#mandatory-acceptance-evidence).

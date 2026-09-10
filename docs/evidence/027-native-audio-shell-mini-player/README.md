# 027 local native shell-audio visual evidence

Captured 2026-09-10 from the exact guarded alternate-entry Release builds for code/test commit
`dc25938`. iOS used iPhone 17 / iOS 26.5 simulator; Android used an API 36 arm64 emulator. The
fixture is synthetic and loopback-only. These images prove only the visible foreground states named
below; they are not hardware, audio-quality, hosted-service, real-account, background or release
evidence.

| File | Platform state | SHA-256 |
|---|---|---|
| `027-ios-mini-repertoire.png` | Repertoire after full-player back; same track/time retained | `8a88bf52de05d1228cf3ab24be176d51aa85aecb227d71b396b88cb5a2f00a8b` |
| `027-ios-mini-home.png` | Home after second back; same compact session retained | `5262f9c51604059683db4f5d056bed9cb51fa7e096d8cceebdec8ccd65b8c8fc` |
| `027-ios-mini-error.png` | Unsupported-format compact error; play visibly disabled | `882c25eeb57554aad8d362a443fb238b414e2853e237df51fc044ebbad275dc6` |
| `027-ios-cleared.png` | Tenant clear completed; compact surface absent | `dff0d45e61984196ede2ff158b373373a017530d6c21b215726d7dbebd959932` |
| `027-android-mini-repertoire.png` | Repertoire after full-player back; same track/time retained | `e6fb96f783e86460015fb453d1eb144d44b8a1f16d022941f394f7d6d6ed7c2a` |
| `027-android-mini-home.png` | Home after second back; same compact session retained | `a72afe1ade8f661edb6a2b3f3febecb8b7be930d9ac7bd4b35c4b73c1f3eab8f` |
| `027-android-mini-error.png` | Unsupported-format compact error; play visibly disabled | `f912ee57c518f1c05a960b418e40045d9a91642e131e130dd65a60c08323bd2f` |
| `027-android-cleared.png` | Tenant clear completed; compact surface absent | `77cfd688d48ab8a8da8108bd081eb94e749aa496c46880fef21c1f40608be8e7` |

The iOS captures are 1206 × 2622 pixels; Android captures are 1080 × 2400. Accessibility-tree
observations separately confirmed semantic open/play/close labels, disabled error controls and the
0:10 / 0:10 state. Loopback server logs confirmed iOS 206 Range requests and Android 200 requests
for the actual deterministic WAV bytes. Exact commands, test counts, failure observations and
authority limits are recorded in the [027 brief](../../briefs/027-native-audio-shell-mini-player.md).

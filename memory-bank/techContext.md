# Teknik bağlam

4 Eylül 2026 yerel dosya kontrolü. Kesin bağımlılık çözümü lockfile'dadır;
bu özet otomatik sürüm yükseltme talimatı değildir.

- Web: Next.js 15, React 19, TypeScript, Tailwind 4, Capacitor 8.
- Mobil hedef: React Native + Expo, ortak TS/Supabase istemcisi, Skia.
  Product workspace: `apps/mobile/` (Expo SDK 57, separate npm lockfile), implemented
  6 September. Native type/test/bundle gate directly verified on macOS on 7 September;
  [004](../docs/briefs/004-rn-kabuk-ve-giris.md) remains pending device/live acceptance.
  Flutter spike yalnız tarihsel referanstır; ürün yolu değildir.
- Backend: Supabase Auth/Postgres/RLS/Realtime/Storage/Edge Functions; AI: Gemini.
- Çalışma ortamı: [package.json](../package.json) Node `>=22.12 <25`, pnpm `11.9.0`.

## Doğrulama komutları

| Katman | Komut ve sınır |
|---|---|
| Salt belge | Bağlantı/tutarlılık incelemesi ve `git diff --check`; ürün testleri tekrar koşulmaz |
| Web kalite kapısı | Kökten `pnpm check`: lint, typecheck, kapsamlı birim test çalıştırması, service worker sözdizimi, build |
| Tarayıcı | Kökten `pnpm test:e2e`; testlerin gerçek üyeli akışı kapsayıp kapsamadığını ayrıca belirt |
| RN product | In `apps/mobile`: `npx tsc --noEmit && npm test && npm run bundle:check`; actual platform builds and hardware acceptance remain separate |
| DB / Edge | İlgili brief'in ortamı ve yetkisi doğrulanmış kontrolleri; web testi bunların yerine geçmez. 012 için yerel izole kapı: `PGDATABASE=<dedicated-test-copy> bash supabase/test-support/012_regression_runner.sh` |

Kapsama oranı sadece yapılandırmadaki seçili dosyaları ölçer; tüm ürün oranı değildir.
Komut bulunmuyor veya ortam eksikse geçti yazma. [CI](../.github/workflows/ci.yml)
tanımı ile gerçekten tamamlanmış CI çalışması da ayrı kanıtlardır.

## Ortam güvenliği

Supabase işlemleri yalnız `supabase-genesinova` / `hievmwwctjjlhmssoxsu`;
doğru araç yoksa başka hesaba geçme. Kimlikler ve SSH aliası [AGENTS.md](../AGENTS.md)'de.
Sır, token, yedek içeriği, kullanıcı verisi hafızaya veya devir metnine yazılmaz.
Railway hazırlığı production bağlantısı değildir. Var olan bucket'ı içermeyen IaC
grafiğini olduğu gibi uygulama; [altyapı kaydındaki](../docs/altyapi-2026-09-04.md)
sürüm/veri/hesap sınırlarını işlem öncesinde yeniden kontrol et.

## Verified local Android environment — 7 September 2026

Existing Homebrew Java 17 and SDK at `/opt/homebrew/share/android-commandlinetools`
were reused; Android Studio was not required by the verified command-line build.
Task-created emulator/API 36 ARM64 image and AVD `genova004_api36` remain reusable.
Exact environment variables, commands, Metro IPv6 fix, partition-size override, APK hash
and screenshots belong to the [Android evidence](../docs/briefs/004-android-build-2026-09-07.md).
Generated `apps/mobile/android/` is ignored; never hand-edit or commit generated files.
Metro/emulator were stopped after acceptance, and absence was checked for handoff.
Keep macOS dependencies intact; do not install Linux binaries into its shared node_modules.
Hardware remains deferred; current acceptance status and next task are in
[activeContext](activeContext.md) and [004](../docs/briefs/004-rn-kabuk-ve-giris.md).

## Where each gate can actually be evaluated — 8 September 2026

Measured across the 8 September agent environments, not assumed. Host capabilities differ;
verify the receiving shell before use and never record an unevaluated gate as passed.

| Gate | Observed agent-shell availability | Where it was run |
|---|---|---|
| `pnpm lint`, `typecheck`, `test:coverage`, `test:service-worker` | **Linux: yes** | A copy of the repository **outside** the connected folder, with its own `pnpm install --frozen-lockfile` and CI's synthetic Supabase environment. 33 files / 206 tests |
| `pnpm build` | **Linux: no** | `next/font` fetches Manrope and Noto Serif at build time; `fonts.googleapis.com` and `fonts.gstatic.com` are refused by the proxy in both agent environments. Owner's macOS, or CI |
| `pnpm test:e2e` | **Linux: no** | Playwright's browser download is refused as well. CI only |
| SQL test files | **macOS desktop task: yes, local isolated copy only** | On 8 September the owner's macOS exposed Homebrew PostgreSQL 17.11 at `127.0.0.1:5432`; 012 ran on `genova_008_test_restore`. This does not grant or prove production access. The runner refuses non-local/non-test-named targets |

Never run an install against `apps/mobile/node_modules` or the root `node_modules` from a Linux
shell — both are macOS installs reached through the connected folder, and reinstalling
invalidates the owner's working setup. Copy the tree out first, as above.

When a CI job fails, the log storage host is unreachable from the agent shells, but the GitHub
API's **check-run annotations** endpoint returns Playwright's failure text, including the
locator and the received value. That is how three CI failures were diagnosed on 8 September.

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
| DB / Edge | İlgili brief'in ortamı ve yetkisi doğrulanmış kontrolleri; web testi bunların yerine geçmez |

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

## Android acceptance follow-up — 7 September 2026

At `6d64d16`, the own Android debug APK built and ran on a dedicated API 36 ARM64 emulator.
Signed-out UI and empty-form validation passed with synthetic loopback settings; no real
account or hardware. [Evidence](../docs/briefs/004-android-build-2026-09-07.md).
This supersedes the earlier absent-SDK/Android-not-run snapshot: the existing Homebrew SDK
and Java 17 were reused, emulator/image added. Current 004 count: 23/27 PASS, four NOT RUN
(hardware keychain, real-phone account flow, remote CI, 010). Ask before resuming postponed
hardware testing; repertoire/PDF stays blocked. No product source or live state changed.

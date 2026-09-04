# Teknik bağlam

4 Eylül 2026 yerel dosya kontrolü. Kesin bağımlılık çözümü lockfile'dadır;
bu özet otomatik sürüm yükseltme talimatı değildir.

- Web: Next.js 15, React 19, TypeScript, Tailwind 4, Capacitor 8.
- Mobil hedef: React Native + Expo, ortak TS/Supabase istemcisi, Skia.
  RN spike tamamlandı; ürün çalışma alanı henüz kurulmuş kabul edilmez.
  Flutter spike yalnız tarihsel referanstır; ürün yolu değildir.
- Backend: Supabase Auth/Postgres/RLS/Realtime/Storage/Edge Functions; AI: Gemini.
- Çalışma ortamı: [package.json](../package.json) Node `>=22.12 <25`, pnpm `11.9.0`.

## Doğrulama komutları

| Katman | Komut ve sınır |
|---|---|
| Web kalite kapısı | Kökten `pnpm check`: lint, typecheck, kapsamlı birim test çalıştırması, service worker sözdizimi, build |
| Tarayıcı | Kökten `pnpm test:e2e`; testlerin gerçek üyeli akışı kapsayıp kapsamadığını ayrıca belirt |
| RN ürün | Kurulumdan sonra ürün çalışma alanında `npx tsc --noEmit && npm test`; cihaz testi ayrıca |
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

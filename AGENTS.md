# genovakorist — AI Agent Configuration

## Repo düzeni
- **Kök** — Next.js 15 web uygulaması. Üretimde, canlı. `app.genesinovachoir.com`
- **`flutter/`** — Flutter mobil uygulaması. Faz 1'de açılacak (henüz yok).
- **`spike/`** — atılacak denemeler. Ürün kodu değildir, buradan import edilmez.
- **`docs/briefs/`** — görev brief'leri. Bir göreve başlamadan önce ilgili brief okunur.
- **`MIGRATION.md`** — geçişin durum defteri. Hangi ekran native, hangisi WebView.

## GitHub
- **Hesap:** genesinovachoir
- **SSH Alias:** `github-genesinova`
- **Remote:** `git@github-genesinova:genesinovachoir/genova_app.git`
- **Git user:** `genesinovachoir` / `genesinova.choir@gmail.com`
- **Push:** `git push` — remote zaten doğru

## Supabase
- **MCP Server:** `supabase-genesinova`
- **Project ID:** `hievmwwctjjlhmssoxsu`
- **URL:** `https://hievmwwctjjlhmssoxsu.supabase.co`
- **Not:** genesinovachoir web sitesiyle aynı Supabase projesini kullanır
- **Tablo sorgusu, migration, log için:** `supabase-genesinova` MCP'yi kullan

## Tech Stack
- **Web:** Next.js 15 · React 19 · TypeScript · Tailwind 4 · Capacitor 8
- **Mobil:** Flutter · supabase_flutter · go_router · riverpod · pdfrx
- **Backend:** Supabase (Auth, Realtime, Storage, Edge Functions)
- **AI:** Gemini

## Önemli Kurallar
- Supabase işlemleri için `supabase-genesinova` MCP kullan, `supabase-diyar` kullanma
- GitHub push için `github-genesinova` SSH alias aktif
- genesinovachoir sitesiyle aynı Supabase DB — schema değişikliklerinde her iki projeyi göz önünde bulundur

## Geçiş kuralları
- **Bir oturumda bir ekran.** `docs/briefs/` altındaki brief'i oku, kapsam dışına çıkma.
- **İki istemci ayrı görünebilir.** Web UI'ını Flutter'a benzetmek için değiştirme; tersi de geçerli. Piksel eşitliği hedef değil.
- **Anotasyon şeması ortak sözleşmedir.** `lib/repertuvar/annotation-types.ts` tek doğru kaynaktır. Dart tarafı bunu birebir yansıtır ve tek taraflı değiştirilmez — değişecekse iki istemci birlikte değişir.
- **Sunucu mantığı Edge Function'a.** Native'e taşınan bir ekran için yeni Next.js API route'u açma; `supabase/functions/` altına yaz ve web'i de aynı fonksiyona bağla.
- **WebView'da kalacak ekranlara Flutter tarafında dokunma.** Liste `MIGRATION.md`'de.

## Git disiplini

- **Her brief'e temiz çalışma ağacıyla başlanır.** `git status` kirliyse önce commit'lenir.
- **Her brief bitince commit atılır**, mesaj brief numarasını içerir (örn. `003: kiracı şeması`).
- **Aynı anda tek ajan.** İki ajan commit'siz aynı repoda çalışırsa biri diğerinin
  değişikliğini ezer. Başka ajana geçmeden önce commit at.
- Üretim kodu (`app/`, `components/`, `lib/`, `supabase/`) ile planlama dosyaları
  (`docs/`, `MIGRATION.md`, `KARARLAR.md`, `spike/`) **ayrı commit'lere** ayrılır.
- `spike/` altında yalnızca kaynak kod commit'lenir; `ios/`, `android/`, `build/`,
  `.expo/`, `canvaskit.wasm` gibi üretilmiş dosyalar `.gitignore`'da.

## Kapılar — geçmeden görev bitmiş sayılmaz
- **Web:** `pnpm check`
- **Flutter:** `flutter analyze && flutter test`

## Dosya hijyeni
- Kök dizine geçici dosya, script veya çıktı yazma. Denemeler `spike/`, notlar `docs/`.
- Üretilen dosyalar (Dart modelleri vb.) elle düzenlenmez — üreteci düzeltilir.

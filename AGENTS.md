# genovakorist — AI Agent Configuration

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
- Next.js + TypeScript
- Supabase (Auth, Realtime, Storage)
- Capacitor (Android + iOS)
- Gemini AI

## Önemli Kurallar
- Supabase işlemleri için `supabase-genesinova` MCP kullan, `supabase-diyar` kullanma
- GitHub push için `github-genesinova` SSH alias aktif
- genesinovachoir sitesiyle aynı Supabase DB — schema değişikliklerinde her iki projeyi göz önünde bulundur

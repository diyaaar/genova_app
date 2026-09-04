# WF-002 — geçiş ajanlarının yönlendirme ve kabul rehberi

4 Eylül 2026. Durum: yerel belge uygulaması ve doğrulama tamamlandı. Tek yazıcı: ana ajan.

## Amaç ve başlangıç

Kullanıcı geçişte kullanılacak ajanların mevcut kurallara yönlendirilmesini,
sonrasında ürün uygulamasına başlamak için kendisine sorulmasını istedi.
Başlangıç `d5d78e8`, çalışma ağacı temiz. `WF-001` yöntemi hazır; geçişe özel
başlangıç/kabul bağlantısı ve devirde kaynak okuma kaydı eksikti.

## Kapsam ve kaynaklar

- İzinli: `AGENTS.md`, `MIGRATION.md` giriş bağlantısı, `docs/gecis-rehberi.md`,
  bu brief, brief/devir şablonları, `memory-bank/activeContext.md` ve `progress.md`.
- Kaynaklar: [çalışma düzeni](../ai-calisma-duzeni.md), [kararlar](../../KARARLAR.md),
  [mobil durum](../../MIGRATION.md), [WF-001](WF-001-ai-calisma-duzeni.md),
  [resmi talimat keşfi](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
- Kapsam dışı: ürün/SQL/config/CI/bağımlılık değişikliği, global ayar/hafıza, gerçek
  alt ajan, başka asistan kurulumu, push/deploy, DB/hosting/dosya göçü ve harcama.

## Başlangıç kontrolü

`AGENTS.md`, altı hafıza dosyası, çalışma düzeni, MIGRATION/KARARLAR, mevcut
brief/devir şablonları ve WF-001 okundu. Tek hedef belge yönlendirmesidir.
RN/WebView/ortak şema ve mevcut ürün kararları değişmez. Kullanıcı yalnız rehber
hazırlığına izin verdi; ürün geçişi başlamadan açık başlama yanıtı beklenecek.
Geri dönüş yalnız bu belge değişikliklerinin yeni bir commit'le geri alınmasıdır.

## Adımlar ve kabul

- [x] Geçiş rehberi mevcut kaynaklara bağlı, ikinci karar/durum defteri değil.
- [x] AGENTS/MIGRATION girişleri, brief ve alt ajan devri rehbere yönlendiriyor.
- [x] Okuma → kapsam/yetki → uygulama → test → ana ajan kabulü açık.
- [x] Kullanıcının başlama onayı bekleniyor; 003'ün canlı kapıları değişmedi.
- [x] Yerel bağlantılar, kapsam ve `git diff --check` kontrol edildi.
- [x] Ana ajanla belge üzerinden pilot senaryolar kontrol edildi.
- [x] `pnpm check` geçti; dış/native katmanlar bu belge işinde çalıştırılmadı.
- [x] Sonuç/hafıza güncellendi; yalnız belge commit'i için kapsam hazır.

## Pilot senaryolar

1. Yeni ana ajan AGENTS/MIGRATION girişinden rehbere ve ilgili brief'e ulaşır;
   başlama onayı yoksa ürün koduna veya canlıya geçmez.
2. Alt ajan devir şablonunda zorunlu kaynakları ve salt okuma sınırını görür;
   başlangıç kontrolünü mesajla döndürür, ortak ağaca yazmaz.
3. Kalıcı WebView ekranı native'e çevrilmez; ortak TS'de tarayıcı bağımlılığı aranır.
4. `003` yerel testi canlı tamamlanma sayılmaz; güncel yedek/ortam/yayın kapıları aranır.

Bunlar belge incelemesidir; gerçek ayrı model/ajanın otomatik talimat yüklediği
veya kurallara uyduğu test edilmiş sayılmaz.

## Sonuç

4 Eylül 2026, yerel çalışma ağacı:

| Kontrol | Sonuç | Sınır |
|---|---|---|
| Yerel Markdown hedefleri | 8 belgede 44 bağlantı; eksik yok | Node ile dosya varlığı; başlık çapaları ve tüm web linkleri test edilmedi |
| Kapsam / whitespace | Geçti | 8 dosyanın tamamı izinli belge alanında; `git diff --check` temiz |
| Pilot senaryolar | 4/4 belge incelemesinde uygun | Ana ajan kaynakları izledi; gerçek alt ajan/model veya yeni Codex oturumu çalıştırılmadı |
| `pnpm check` | Geçti | lint, typecheck, 22 dosyada 114 test, service worker syntax, production build; exit 0 |
| E2E / DB / Edge / provider / cihaz | Çalıştırılmadı | Yalnız belge görevi; canlı durum yeniden sorgulanmadı |

OpenAI Docs becerisi kapsamında resmi AGENTS keşif belgesi okunarak kısa giriş
bağlantısı ve oturuma açık kaynak yolu verme yaklaşımı uygulandı; ayar/CI değişmedi.
Ürün geçişi, push/deploy ve veri taşıması başlatılmadı. Kullanıcıya son teslimde
başlama sorusu sorulacak. Onaydan sonraki ilk adım özellik/brief envanteri ve
003'ün açık kapılarının güncel kontrolüdür; eski izinler sınırsız yetki sayılmaz.

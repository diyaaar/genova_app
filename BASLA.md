# BURADAN BAŞLA

Bu dosya, projeye bir süre ara verdikten sonra ya da **yeni bir AI ajanıyla** devam
etmek istediğinde okunacak tek sayfadır.

---

## Proje nedir

Genova, Genesinova Korosu'nun yönetim uygulaması. Bugün **Next.js web uygulaması**
olarak canlıda (`app.genesinovachoir.com`), Capacitor'la mobilde sarmalanmış.

**Hedef:** App Store ve Play Store'da yayınlanan, hızlı, çok korolu bir mobil uygulama.

---

## Bir ajana ne söylemelisin

Kopyala, yapıştır. Hepsi bu:

> Bu depoyu aç. Önce `AGENTS.md` ve `MIGRATION.md` dosyalarını oku.
> Sonra `MIGRATION.md`'deki "Sıradaki iş" bölümünde yazan brief'i uygula.

Ajan gerisini dosyalardan öğrenir: nerede kaldığımızı, hangi kararların verildiğini,
neyi yapmaması gerektiğini. **Sen hiçbir şeyi tekrar anlatmak zorunda değilsin.**

---

## Hangi ajan işe yarar

Tek şart: **dosyaları okuyabilmeli ve Mac'inde komut çalıştırabilmeli.**

| Ajan | Olur mu | Not |
|---|---|---|
| **Antigravity** | ✅ En uygun | Zaten kurulu, Supabase ve GitHub bağlantıları ayarlı |
| Claude Code | ✅ | Terminalden çalışır |
| ChatGPT + Codex | ✅ | Depoya bağlanan sürümü. Kod yazar, komut çalıştırır. |
| Cursor / Windsurf | ✅ | Editör içi ajanlar |
| **ChatGPT (normal web/telefon)** | ❌ | Dosyalarına erişemez, komut çalıştıramaz. Sadece soru sormak için. |

Yani sorunun cevabı: **evet, ChatGPT devam ettirebilir — ama depoya erişebilen
sürümüyle (Codex).** Normal ChatGPT penceresi yapamaz.

---

## Dosyalar ne işe yarıyor

| Dosya | Ne için |
|---|---|
| `MIGRATION.md` | **Durum defteri.** Nerede kaldık, sırada ne var. Her iş bitince güncellenir. |
| `KARARLAR.md` | Verilmiş kararlar ve gerekçeleri. Ajan bunları tekrar tartışmasın diye. |
| `AGENTS.md` | Ajan kuralları. Her oturumda otomatik okunur, kısa tutulur. |
| `docs/briefs/` | Görev talimatları. Her iş için bir dosya. |
| `docs/store-yayin.md` | Mağaza yayını için eksikler listesi |
| `docs/urun-ve-maliyet.md` | Maliyet ve çok koroluluk kararları |

---

## Senden beklenen tek disiplin

Yeni bir işe başlarken **önce brief yaz** (`docs/briefs/_TEMPLATE.md` şablonu var),
sonra ajana ver. Doğrudan "şunu yap" demekten çok daha iyi sonuç verir ve
çok daha az token harcar — çünkü ajan 45.000 satırı keşfetmek yerine 50 satır okur.

Brief yazmayı da ajana yaptırabilirsin: *"`docs/briefs/_TEMPLATE.md`'yi kullanarak
şu iş için bir brief yaz"* de, sonra okuyup onayla.

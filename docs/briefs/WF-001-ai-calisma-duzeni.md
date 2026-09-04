# WF-001 — AI çalışma düzeninin Genova'ya uyarlanması

4 Eylül 2026. Durum: yerel kurulum ve doğrulama tamamlandı. Tek yazıcı: ana ajan.
`WF` yöntem işleri içindir; mobil `001/002/003` sırasını değiştirmez.

## Amaç ve başlangıç

Kullanıcının iki video, GitHub ve 13 ekran görüntüsüyle verdiği yaklaşımı mevcut
Genova kararlarına uyarlamak; yeni projeye taşınabilir çekirdek/şablon sağlamak.
Başlangıç çalışma ağacı temiz. Eski `AGENTS.md` ve brief şablonu Flutter derken
`KARARLAR.md` / `MIGRATION.md` RN + Expo kararını içeriyordu. Hafıza bankası yoktu.

## Kaynaklar ve kapsam

- [Video analizi](../ai-calisma-yontemi-kaynak-analizi.md),
  [kaynak repo ve ekran incelemesi](../ai-calisma-yontemi-repo-incelemesi.md).
- [Kararlar](../../KARARLAR.md), [mobil durum](../../MIGRATION.md),
  [003 kanıtı](003-dogrulama.md), [altyapı kaydı](../altyapi-2026-09-04.md).
- İzinli değişiklikler: `AGENTS.md`, `KARARLAR.md`, `memory-bank/`, ilgili `docs/`.
  Kullanıcı talebiyle ayrı kişisel hafıza güncelleme notu.
- Kapsam dışı: uygulama/SQL/test kodu, bağımlılık, CI, Supabase işlemi, hosting,
  gerçek dosya taşıma, ücretli plan, push, diğer depolar ve global skill kurulumu.

## Uygulama ve geri dönüş

1. Altı kısa hafıza dosyasını gerçek yerel kaynaklarla doldur; canlı doğrulama gibi sunma.
2. Aktif RN yönlendirmesini düzelt; ana ağaçta tek yazıcı + kontrollü devir kuralını yaz.
3. Ortak çalışma döngüsü, brief, ajan/oturum devri ve proje profili şablonlarını bağla.
4. Kaynak farklarını kaydet; bağlantı/çelişki/diff kontrolü, pilot okuma ve `pnpm check` yap.
5. Sonucu ve kısa hafızayı güncelle; yalnız belge commit'iyle devret.

Geri dönüş yalnız bu belge değişikliklerini yeni bir commit'te geri almaktır;
ürün verisi ve yayınına etkisi yoktur. Başkasının değişikliği görülürse sahiplik çözülmeden ilerlenmez.

## Bitti tanımı

- [x] Altı hafıza dosyası mevcut ve asıl kaynaklara bağlanıyor.
- [x] Aktif talimatlar RN + Expo'yla tutarlı; tarihsel Flutter kaydı korunuyor.
- [x] Yeni projeye özgü profil, brief ve sınırlı ajan devri kullanılabilir.
- [x] Belge bağlantıları ve diff kontrolü geçti; ürün kodu değiştirilmedi.
- [x] Pilot kaynak/devir senaryoları doğru sınırı gösterdi.
- [x] `pnpm check` geçti; çalıştırılmayan dış/native katmanlar açıkça yazıldı.
- [x] Sonuç/hafıza güncel ve belge commit'i hazır.

## Pilot kontrol senaryoları

Bu bir gerçek çok ajan çalıştırması veya maliyet deneyi değildir; ana ajan tarafından
belge üzerinden yapılan yönlendirme/kabul kontrolüdür.

1. **"003 bitti mi?"** Giriş → activeContext/progress → 003 doğrulama.
   Beklenen: yerel hazır, canlı kapılar açık; DB'yi otomatik uygulamamak.
2. **"Mobil kuruluma başla."** Giriş → techContext → MIGRATION → 002 kurulum zinciri.
   Beklenen: RN + Expo; olmayan Flutter ürün klasörüne gitmemek, spike'ı ürün saymamak.
3. **"Kolay bağlantı taramasını devret."** Devir sözleşmesi → salt okuma, izinli belgeler,
   hafif model gerçekten seçilebiliyorsa seçim, çıktı/deneme sınırı. Beklenen: ortak
   ağaca yazmamak, alt-alt ajanı otomatik açmamak, ana ajanın kanıtı kabul etmesi.

## Doğrulama sonucu

4 Eylül 2026, yerel çalışma ağacı:

| Katman | Sonuç | Kanıt / sınır |
|---|---|---|
| Hafıza yapısı | 6 dosya, toplam 180 satır | Kısa indeks; tam geçmiş/kanıt kopyası değil |
| Markdown hedefleri | 54 yerel bağlantı, eksik hedef yok | 15 değişen/yeni belgedeki bağlantıların dosya varlığı kontrolü; web linkleri/başlık çapaları test edilmedi |
| Kapsam ve whitespace | Geçti | `git diff --check`; tüm değişen dosyalar izinli belge alanlarında, ürün/config diff'i yok |
| Kaynak/devir pilotu | 3/3 beklenen sonuca uygun | Ana ajanın belge kontrolü; gerçek alt ajan/ayrı model çalıştırılmadı |
| Web `pnpm check` | Geçti | lint + typecheck + 22 dosyada 114 test + service worker sözdizimi + production build |
| Birim kapsamı | %92,77 statement, %81,33 branch | Yalnız seçili dosyalar; doküman doğruluğunun veya tüm ürünün ölçümü değil |
| E2E / canlı DB / Edge / cihaz | Bu işte çalıştırılmadı | Belge işi; önceki sonuçlar yeni test gibi kullanılmadı |

Pilot 1, 003'ün canlı kapılarını açık buldu; otomatik göç yapılmadı. Pilot 2, RN kararı
ve 002'nin sekiz maddelik ürün kurulum zincirine ulaştı; Flutter ürün yolu önerilmedi.
Pilot 3, salt okuma/model/derinlik/son kabul alanlarını buldu. Ajan maliyeti ölçülmedi.

Kural/doküman paketi hazır; otomatik ajan zamanlayıcısı veya yeni CI doküman denetçisi
kurulmadı. `pnpm check` mevcut ürün kapısıdır; belge bağlantı kontrolü bu işte ayrıca yapıldı.
Push/deploy, DB göçü ve başka projelere kurulum yapılmadı.
Sonraki adım: genel ürün/altyapı resmini değerlendirip devam edilecek tek brief'i seçmek.

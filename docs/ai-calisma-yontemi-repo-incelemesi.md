# AI çalışma yöntemi — kaynak repo ve alt ajan yaklaşımı

4 Eylül 2026. Durum: inceleme + uyarlama önerisi; çalışan şablon/ajan sistemi kurulmadı.
Önceki bağlam: [iki video metninin analizi](ai-calisma-yontemi-kaynak-analizi.md).

## Bulunan kaynaklar ve inceleme sınırı

Kullanıcının verdiği `aethelisdev` profilinde doğrudan ilgili paylaşım:
[aiguidelines.md](https://github.com/aethelisdev/aiguidelines.md).
README, proje özelinde düzenlenecek AI kurallarını paylaştığını açıkça belirtiyor.
İncelenen sürüm: `352c5205257d5786106ec171d309115cc886de46` (27 Ağustos 2026).
GitHub dosya ağacı eksiksiz döndü: yalnız `AI_GUIDELINES.md`, `README.md`, `LICENSE`.
Üç dosyanın tamamı okundu; kural dosyası 176 satır ve 12 bölüm.

Birincil kaynaklar:

- [AI_GUIDELINES.md — sabit sürüm](https://github.com/aethelisdev/aiguidelines.md/blob/352c5205257d5786106ec171d309115cc886de46/AI_GUIDELINES.md)
- [README](https://github.com/aethelisdev/aiguidelines.md/blob/352c5205257d5786106ec171d309115cc886de46/README.md)
- [MIT LICENSE / Aethelis 2026](https://github.com/aethelisdev/aiguidelines.md/blob/352c5205257d5786106ec171d309115cc886de46/LICENSE)

Karşılaştırma için aynı profildeki Rust oyun motoru
[aeon-engine](https://github.com/aethelisdev/aeon-engine/tree/63ead105a3685ba0b7162c10a6e1a3bc63fad3ec)
incelendi. Sabit sürüm: `63ead105a3685ba0b7162c10a6e1a3bc63fad3ec` (4 Eylül 2026).
Kapsam: tam dosya ağacı, README, Cargo.toml, .gitignore, CI ve iki issue şablonu.
Motor kaynak kodunun tamamı denetlenmedi; motor derlenmedi/çalıştırılmadı.
Bu, videodaki oyun motoru anlatımına uyan bağlamsal adaydır; video yayınıyla commit
eşleştirmesi yapılmadı. Motorun lisans beyanı MPL-2.0; guidelines deposunun MIT
lisansıyla karıştırılmamalı. Bu incelemede üçüncü taraf kodu ürüne kopyalanmadı.

## Somut bulgular

1. **Paylaşım bir kurallar belgesi, hazır otomasyon uygulaması değil.**
   `memory-bank/` ve `knowledge/history/` yolları tarif edilmiş, içerikleri verilmemiş.
   Belgede geçen `scripts/export_public.py` de bu üç dosyalı depoda yok.
2. **Motorun incelenen public ağacında devir hafızası yok.** `memory-bank/`,
   `knowledge/`, `AI_GUIDELINES.md` ve exporter bulunmadı. Guidelines'ın public export
   bölümünde bunları ayıklama anlatılıyor; bu yokluğu açıklayabilir, fakat özel
   deponun veya o scriptin işleyişinin doğrulandığı anlamına gelmez.
3. **Modüler yapı için somut örnek var:** Cargo workspace, core/render/audio/physics
   ve UI gibi ayrı paketler tanımlıyor. Paket ayrımı tek başına bağımlılık kalitesini kanıtlamaz.
4. **Kural ile otomatik kontrol farklı:** guidelines Clippy/format/test isterken
   [motor CI dosyası](https://github.com/aethelisdev/aeon-engine/blob/63ead105a3685ba0b7162c10a6e1a3bc63fad3ec/.github/workflows/rust.yml)
   check/build/test çalıştırıyor; kurduğu Clippy ve rustfmt'i çalıştıran adım yok.
   Bu yalnız incelenen workflow bulgusudur; geliştiricinin yerel kontrollerine dair iddia değildir.
5. **Ajan görev dağıtıcısı yok.** Model seçimi, alt ajan hiyerarşisi, bütçe veya görev
   devri protokolü bu kurallar dosyasında tanımlı değil. Bunlar kullanıcının ek önerisi.

## Genova'ya uyarlama kararı önerisi

Bu tablo uygulanmış kurallar değil; Genova'ya özel taslak değerlendirmedir.

| Kaynaktaki alan | Genova karşılığı / farkı |
|---|---|
| 1 — Rust güvenliği, API doğruluğu | Mevcut sürümün dokümanını doğrula; sınır girdilerini doğrula, gizli anahtarları istemciden uzak tut. Otomatik sürüm yükseltme yapma. |
| 2 — Public API dokümanı, dil, 8/10 | Önemli TS sözleşmelerinde amaç/yan etki/yetki/hata açıklaması. Türkçe ürün metnini İngilizceye çevirme; öz puan test yerine geçmez. |
| 3 — Hafıza eşzamanlama | Mevcut karar ve durum belgelerine bağlı kısa indeks; ilgili değişikliği kaydet. Her tur tüm geçmişi okuyup ilgisiz belgeleri değiştirme. |
| 4 — Modül sınırları, 800/100 satır | Sorumluluk ve bağımlılık esaslı inceleme; boyut uyarısı. Otomatik toplu bölme yok. |
| 5 — Kapsam, mimariyi koruma | Brief kapsamını koru; mevcut mimariyi kanıtsız kusursuz ilan etme. Önce araştır; karar/izin gerektiren belirsizliği kullanıcıya taşı. |
| 6 — Kalite ve ölçümler | Mevcut `pnpm check`, ayrı E2E, ilgili DB/Edge/native kontrolleri. Ölçülmeyen performansa sıfır etki yazma. |
| 7 — Lisans başlıkları | Kaynak atfını/lisansını koru; örnek telif sahibini veya lisansı tüm Genova dosyalarına yayma. |
| 8 — Git/public export | Mevcut brief commit disiplini korunur. Olmayan exporter çağrılmaz; push/deploy/veri göçü birbirinden ayrılır. |
| 9 — Clone/hot loop | JS kopyalamalarını körlemesine yasaklama; React state doğruluğunu koru, ölçülmüş PDF/ses darboğazına odaklan. |
| 10 — İsimden davranış tahmini | Rol/koro/provider kararlarını açık veriden al. Dosya adını yetki kanıtı sayma; meşru ayrıştırmayı ve güvenlik filtrelerini kaldırma. |
| 11 — Uyarı bastırma | Sebepsiz lint/typecheck kapatmayı önle; gerekiyorsa dar, gerekçeli ve testli istisnayı değerlendir. |
| 12 — Nesnel anlatım | Şişirilmiş iddiaları çıkar; kullanılan Supabase/Railway gibi sağlayıcı adlarını ve kaynak atıflarını yasaklama. |

Yerel karşılaştırma: `AGENTS.md`, mevcut analiz, `package.json`, `.github/workflows/ci.yml`
okundu. Genova'da `pnpm check` ve ayrı tarayıcı işi zaten tanımlı; bunları Rust CI ile
değiştirmek gerekmiyor. CI tanımı okundu; bu oturumda CI sonucu veya ürün testi üretilmedi.

## Kullanıcının ek önerisi: göreve göre alt ajan / model seçimi

Amaç: ana ajanın bağlamını ve pahalı muhakeme zamanını, düşük riskli mekanik işlerle
doldurmamak. **Alt ajan sayısı, model kapasitesi ve hiyerarşi derinliği farklı kararlardır.**
Aynı güçlü modelden daha çok ajan açmak kendiliğinden ucuzluk sağlamaz.

Önerilen dağılım:

| Rol | Uygun işler | Sonuç sorumluluğu |
|---|---|---|
| Ana ajan / yüksek muhakeme | Mimari, kapsam, ortak veri şeması, yetki, kabul ölçütü, entegrasyon | Son kararı verir, gelen işi kod/test kanıtıyla kabul eder. |
| Dengeli uygulayıcı | Net sözleşmeli sınırlı modül değişikliği | İzinli alanı değiştirir; diff, test sonucu ve belirsizlik döndürür. |
| Hafif alt ajan | Dosya/bağlantı envanteri, belirli kanıtı bulma, mekanik belge düzeni, belirlenmiş örneklerden test taslağı | Öneri/kanıt üretir; mimari, yetki veya canlı yayın kararı vermez. |

- Zorluk yalnız satır sayısından anlaşılmaz: tek satırlık RLS veya dosya erişim değişikliği
  yüksek riskli olabilir. Güvenlik testinin tasarımını "kolay test yazımı" diye devretme.
- Delegasyon ancak bağımsız, sınırları net ve kontrol edilebilir bir işte anlamlıdır.
  Devir/tekrar okuma/inceleme maliyeti daha yüksekse ana ajan işi doğrudan yapar.
- Alt ajan görevi: hedef, izinli dosyalar, değiştirilmeyecek alanlar, gerekli kaynaklar,
  beklenen çıktı, kabul kontrolü, zaman/deneme sınırı ve üst ajana dönme koşulu içerir.
- Eksik bağlam, sözleşme değişikliği, beklenmedik test hatası veya kapsam aşımı varsa
  küçük ajan daha fazla varsayım üretmek yerine üst ajana döner. Önceden belirlenen
  deneme sınırı aşılınca aynı döngü sınırsız tekrarlanmaz.
- Varsayılan taslak derinlik **ana ajan → alt ajan**. Alt ajanın yeni ajan açması otomatik
  değil; yalnız bağımsız iş ve açık ana ajan kararı olduğunda değerlendirilir.
- Ürün sırları ve canlı erişim anahtarları alt göreve otomatik aktarılmaz. Delege etme
  yetkisi, para harcama/deploy/DB göçü/veri paylaşımı için yeni yetki üretmez.
- Başarı metriği ajan adedi değil: kabul edilen doğru çıktı, toplam süre, tekrar sayısı
  ve mümkünse gerçek toplam kullanım maliyeti. Ölçmeden tasarruf yüzdesi vaat edilmez.

**Mevcut kural sınırı:** Genova `AGENTS.md` hâlâ "aynı anda tek ajan" diyor.
Bu inceleme turunda alt ajan açılmadı ve kural sessizce değiştirilmedi. Gelecek uyarlama
önerisi: ana çalışma ağacında tek yazıcı; okuma/rapor işleri kontrollü alt ajanlara,
gerekirse kod işleri gerçekten ayrı çalışma kopyalarına. Ayrı kopya yoksa eşzamanlı
yazım yok. Ajan politikasını değiştirmek ayrı, görünür bir şablon uyarlama adımıdır.

## Sonraki somut adım

Ortak yöntem çekirdeğini ve Genova profilini mevcut belgelere göre tasarlamak;
eksik memory-bank indeksini, görev devri sözleşmesini ve doğrulama kapılarını küçük
bir pilot brief üzerinde denemek. Yeni projeye asgari kurulum; mevcut projeye fark
odaklı geçiş. Hazır olmadığı görülen dosyalar "depodan çekildi" diye sunulmayacak.
Bu turda yalnız bağlam belgeleri güncellendi; kod/kurallar/global skill, hosting ve DB değişmedi.

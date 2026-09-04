# Yeni proje / mevcut projeye uyarlama profili

Bu şablon ortak yöntemi başka projeye taşırken doldurulur. Bilinmeyene
"doğrulanmadı" yaz; örnek teknolojiyi, hesabı veya yapılmış test sonucunu icat etme.
Bu dosyanın kopyalanması tek başına kurulum veya kabul değildir.

## Kimlik ve kaynak haritası

- Proje adı, amacı, kullanıcıları:
- Depo / sahip / çalışma dizini (kimlik bilgisi değil):
- Mevcut giriş kuralları, karar kaydı, durum defteri, görev brief'leri:
- Mevcut hafıza sistemi varsa korunacak kaynak ve yeni düzene eşleştirmesi:
- Paylaşılan DB / diğer uygulamalar / harici servisler:
- Kapsam dışı ve korunacak kullanıcı kararları:

## Teknik profil

- Gerçek manifest/lockfile ve teknoloji:
- İstemci / sunucu / veri / dosya sınırları:
- Ortak sözleşmeler ve geriye uyumluluk:
- Yerel / test / production ayrımı:
- Her test komutu, çalışma dizini ve kapsamadığı alanlar:
- Yayın yolu, yetki, yedek, geri dönüş:

## Altı hafıza dosyasının doldurulması

| Dosya | Bu projede yazılacak bilgi |
|---|---|
| `memory-bank/projectbrief.md` | Amaç, kapsam, temel gereksinim ve kapsam dışı |
| `memory-bank/productContext.md` | Kullanıcı problemi, temel akış ve deneyim hedefi |
| `memory-bank/systemPatterns.md` | Sorumluluk/sözleşme sınırları ve asıl kaynak haritası |
| `memory-bank/techContext.md` | Doğrulanmış araçlar, kurulum, test kapıları ve ortam sınırı |
| `memory-bank/activeContext.md` | Güncel tek odak, engel, karar ve sonraki iş |
| `memory-bank/progress.md` | Durum ve ayrıntılı test/karar kayıtlarına bağlantı |

Her bilgiye kaynak/tarih/sınır ekle. Ayrıntıları asıl belgede tut; hafıza kısa olsun.
Yalnız değişen özetleri güncelle. Projeye ait sırlar ve gerçek müşteri verileri girmez.

## Geçiş ve pilot kabulü

- [ ] Mevcut çalışma ağacı ve kurallar okundu; fark/çelişki listesi hazır.
- [ ] Değişiklik kapsamı yetkili; çalışan kod için toplu yeniden yazım gerekmiyor.
- [ ] Ortak yöntem + brief + devir şablonu projeye uyarlanıp giriş kurallarına bağlandı.
- [ ] Eski belgelerin hangisinin asıl kaynak olduğu açık; ikinci otorite yaratılmadı.
- [ ] Alt ajan gerekiyorsa görev/model/yazıcı sınırı açık; yoksa tek ajan yeterli.
- [ ] Bir küçük pilot işte doğru kaynak bulundu, kabul kontrolü koşuldu, devir kaydı anlaşılıyor.
- [ ] Gerçek test sonucu ve koşulmayan katmanlar kaydedildi; Git devri tamamlandı.

Başka bir asistan/araç otomatik okumuyorsa oturum başında şu yönlendirmeyi ver:

> Bu projenin giriş kurallarını, kısa hafıza dosyalarını ve ilgili görev brief'ini oku.
> Önce mevcut durumu kanıtla; yalnız verilen kapsamı uygula, doğrula ve devir kaydını güncelle.

Kopyalama sırasında Genova'ya özel paragrafları değiştir; Genova hesap/domain/kararları
bu projeye taşınmaz. Kişisel global skill veya diğer depolar ayrı kurulum kapsamıdır.

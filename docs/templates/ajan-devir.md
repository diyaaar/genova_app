# Görev / oturum devri

Hem alt ajan sözleşmesi hem sonraki oturum için kullanılır. Gereksiz alanları çıkar;
boş şablon, yapılmış iş veya verilmiş izin değildir.

## Başlamadan önce

- Ana brief / tek hedef:
- Ana ajan / kabul sahibi:
- Mod: salt okuma raporu / ayrı kopyada uygulama / sıralı yazıcı devri.
- Çalışma yolu, branch ve başlangıç commit'i; mevcut kullanıcı değişiklikleri:
- İzinli dosyalar ve yasak alanlar:
- Okunacak kaynaklar ve mevcut desen:
- Geçiş işiyse [geçiş rehberi](../gecis-rehberi.md), `AGENTS.md` ve ana brief'in
  açık yolları; alıcının gerçekten okuduğu kaynaklar ve başlangıç kontrolü:
- Beklenen çıktı ve kabul kontrolü:
- Risk; verilmiş yetki ve ayrıca onay gerektiren işlemler:
- Model seviyesi ve gerekçesi; araçta gerçekten seçilen model veya seçilemedi bilgisi:
- Süre / deneme sınırı (varsayılan aynı yaklaşımda iki başarısız deneme sonrası dönüş):
- Ajan derinliği (varsayılan daha fazla alt ajan yok):

Salt okuma işi dosya, Git veya test/build çıktısı yazmaz. Ayrı kopya dosya çakışmasını
azaltır; aynı DB, deploy hesabı veya harici kaynağı güvenli hale getirmez.
Sır/token/kişisel veri yerine gerekli asgari bağlamı ver.

## Üst ajana dönme / durma koşulları

- Kaynak eksik/çelişkili, izinli alan yetmiyor veya ortak sözleşme değişecek.
- Beklenmedik güvenlik/erişim etkisi, dış işlem, test hatası veya deneme sınırı.
- Başka yazıcı, kullanıcı değişikliği veya hedef ortam belirsizliği.

## Dönen sonuç

- Tamamlanan iş ve diff / dosya bağlantıları:
- Kontroller: tarih, komut, ortam, sonuç; çalıştırılmayan katmanlar:
- Kanıtla desteklenen bulgular / ayrı varsayımlar:
- Commit veya salt okuma raporu; yazıcı devri durumu:
- Kalan risk, gereken kullanıcı kararı ve önerilen tek sonraki adım:
- Gerçek kullanım ölçülebiliyorsa süre/tekrar/maliyet; değilse ölçülmedi:

Ana ajan diff ve kanıtı inceler; gerekli entegrasyon testini yapar. Alt ajanın
"bitti" demesi son kabul değildir. Push/deploy/DB değişimi bu sözleşmeyle kendiliğinden yetkilenmez.
Geçişte alıcının başlangıç kontrolü eksikse ana ajan uygulama çıktısını kabul etmez;
önce kaynak/kapsam açığını giderir. Devir alan ajan da kurallara tabi, yeni yetki sahibi değildir.

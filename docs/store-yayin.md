# Mağaza Yayını — App Store & Play Store

> Bu **Flutter geçişinden ayrı bir hat.** Bir kısmı bugün, mevcut web/Capacitor
> uygulamasıyla başlayabilir ve Flutter'a olduğu gibi taşınır.
> Durum: **hiç yayınlanmadı** (`versionCode 1`, `MARKETING_VERSION 1.0`, `DEVELOPMENT_TEAM` boş).

## Repoda tespit edilen eksikler

| # | Eksik | Sonuç |
|---|---|---|
| 1 | `ios/App/App/Info.plist` içinde **hiç `NS*UsageDescription` yok** | Uygulama ses kaydı alıyor ve fotoğraf seçiyor. iOS izin isterken **çöker**; App Review kesin reddeder. Gereken: `NSMicrophoneUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription` |
| 2 | Android manifest'te sadece `INTERNET` var | `RECORD_AUDIO` ve Android 13+ için `POST_NOTIFICATIONS` yok — push bildirimi hiç gelmez |
| 3 | **Hesap silme akışı yok** | 2022'den beri her iki mağazada da **zorunlu**: hesap açtıran uygulama, uygulama içinden hesap silmeyi de sunmak zorunda. Tek başına ret sebebi. |
| 4 | Gizlilik politikası sayfası yok | Zorunlu, URL olarak isteniyor |
| 5 | Demo hesap yok | Uygulama tamamen giriş duvarının arkasında. App Review'a çalışan bir hesap verilmezse 2.1'den reddedilir. |
| 6 | `DEVELOPMENT_TEAM` boş | Apple Developer Program hesabı bağlı değil |

## Şimdi yapılabilir (Flutter beklemez, Flutter'a aynen taşınır)

1. **Hesap silme** — web'e ekle. Üye kendi hesabını siler; Supabase tarafında
   `choir_members` anonimleştirme + auth kullanıcısı silme. Bir Edge Function işi.
   Play ayrıca **web üzerinden de** silme talebi URL'i istiyor; aynı sayfa iş görür.
2. **Gizlilik politikası** — `app.genesinovachoir.com/gizlilik`. İçermeli: toplanan veriler
   (ad, e-posta, profil fotoğrafı, **ses kayıtları**, devamsızlık kaydı, anotasyonlar),
   saklama süresi, üçüncü taraflar (Supabase, Google Drive, FCM), iletişim adresi, KVKK hakları.
3. **Demo hesap** — App Review için kalıcı bir korist hesabı, örnek verilerle.
4. **Geliştirici hesapları** — Apple Developer Program (yıllık $99, şahıs/kurum onayı sürebilir),
   Google Play Console (tek seferlik $25).
5. **Play kapalı test saatini başlat** — aşağıya bak, takvim kısıtı var.

## Play'in 12 test kullanıcısı / 14 gün kuralı

Kasım 2023'ten sonra açılan **şahıs** Play hesapları, üretime çıkmadan önce
**12 test kullanıcısıyla 14 gün kesintisiz kapalı test** yapmak zorunda.
Koro için 12 kişi bulmak kolay ama **14 gün takvim işi** — Flutter geliştirmesiyle
paralel yürütülmeli, sonuna bırakılmamalı. Mevcut Capacitor derlemesi kapalı teste
yüklenebilir; kapalı test üretim incelemesi kadar katı değil.

**Kurum (organization) hesabıyla açarsan bu kural uygulanmaz.** Koro dernek/tüzel kişilikse
kurum hesabı hem bu 14 günü atlatır hem de mağazada kurum adıyla görünür.

## Dağıtım şekli — karar gerekiyor

| Yol | Uygun mu | Not |
|---|---|---|
| **Herkese açık listeleme** (önerilen) | Evet | Koristler mağazada arayıp kurar, en rahat dağıtım. Giriş duvarı sorun değil — demo hesap verilir. |
| Apple Business Manager özel uygulama | Kurumsal | Listelenmez, sadece davetliler. Kurumsal Apple hesabı ve D-U-N-S gerekir. |
| TestFlight / Play kapalı test | Geçici | Hızlı ama TestFlight derlemeleri 90 günde dolar; kalıcı çözüm değil. |

## Gönderim anı (Faz 1 bittiğinde)

- App Privacy (Apple) ve Data Safety (Play) formları — ses kaydı ve fotoğraf beyan edilmeli
- Uygulama ikonu, açılış ekranı, mağaza görselleri (iPhone + iPad, telefon + tablet boyutları)
- Yaş sınırı, kategori, açıklama metinleri (TR + EN)
- APNs anahtarı (Apple) ve FCM yapılandırması
- iOS: `NSUserTrackingUsageDescription` gerekmez (takip yok) ama App Privacy'de "veri toplanıyor, takip yok" işaretlenmeli

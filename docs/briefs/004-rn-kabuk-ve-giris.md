# 004 — RN ürün kurulumu, giriş ve koro seçimi

**Durum:** Hazırlık brief'i; ürün kodu başlamadı. 5 Eylül 2026 güncellemesi.
**Amaç:** Aynı depoda telefonda çalıştırılabilir Expo ürününü kurmak; güvenli giriş,
üyelik çözümü ve koro seçimiyle repertuvar adımına hazır kabuğa ulaşmak.
Sıra/kabul kaynağı: [teslim planı](../mobil-teslim-plani.md), [karar #19](../../KARARLAR.md).

## Başlangıç ve önkoşul

4 Eylül kaydındaki “003 canlı değil” engeli güncelliğini yitirdi. 003 ve 005 canlı
kanıtları kendi brief'lerindedir; 007 altyapısı canlı, allow-list boş.
002 spike ürün değildir. Expo ürün çalışma alanı henüz yoktur.
Minimum 008 davet/üyelik ve temel limit kabulü bu işten önce gelir. Gelişmiş
ticari panel, ödeme, hosting taşıması veya tüm mobil ekranlar önkoşul değildir.

## Kaynak ve kapsam

- AGENTS, altı hafıza özeti, çalışma döngüsü ve geçiş rehberi.
- 002 kurulum/cihaz öğrenimleri; 003/005/007 kanıtları; 008 ve temel limit kabulü.
- `components/AuthProvider.tsx`: oturum/üyelik/rol ve çıkış davranışı.
- `components/BottomNav.tsx`, `components/AppProviders.tsx`: mevcut gezinme/tema niyeti.
- 005 aktif-koro sözleşmesi; tarayıcı bileşeni veya DOM kodu doğrudan taşınmaz.

Önerilen alan `apps/mobile/`, testleri ve gerekli kök workspace/lockfile ayarıdır.
Kesin yol, paket yöneticisi, komutlar ve güncel Expo sürümleri uygulama başında
doğrulanır. Ortak TS sözleşmesi gerekirse dar kapsamla paylaşılır; sırlar istemciye girmez.
Web ekranları, DB migration, Capacitor ve spike değişikliği kapsam dışıdır.

## Geçiş başlangıç kontrolü

Plan revizyonunda AGENTS/hafıza/yöntem/rehber, MIGRATION/KARARLAR ve eski 004 okundu.
Kod kaynakları uygulama başlangıcında yeniden okunur; bu revizyon kod denetimi değildir.
Uygulayıcı başlangıç commit'i, temiz ağaç/sahiplik, kesin yollar, gerçek ortam,
kullanıcı yetkisi ve gerekli testleri burada kaydeder. Ana ajan tek yazıcıdır.
Bu belge tek başına hesap atama, yayın, e-posta veya harcama yetkisi vermez.

## Uygulama adımları

1. Minimum backend kabulünü ve 005 sözleşmesini doğrula; Expo ürün alanını kur.
2. Giriş, güvenli oturum saklama/yenileme ve çıkışı uygula.
3. Sıfır üyelikte anlaşılır durum; tek üyelikte otomatik koro; çok üyelikte zorunlu
   seçim. Aktif koro sunucuda doğrulanır; seçim başarısızsa veri ekranı açılmaz.
4. Repertuvar akışına hazırlanacak küçük kabuğu ve temayı kur. Çalışmayan beş
   sekme eklemek kabul şartı değildir; PDF/listenin veri uygulaması sonraki brief'tir.
5. Test ve gerçek telefon denemesini kaydet; 004 bitince repertuvar okuma işine geç.

## Kabul ve test

- [ ] Ürün alanı spike'tan bağımsız; sürüm/komut/kurulum kaydı yeniden üretilebilir.
- [ ] Yanlış giriş, oturum yenileme, yeniden açılış, sıfır/tek/çok üyelik çalışır.
- [ ] Koro değişimi ve çıkışta önceki koroya ait özel cache temizlenir;
  başarısız seçim/sona eren oturum başka koro verisi göstermez.
- [ ] RN tip/test kapısı; kök ayar/ortak kod değiştiği için `pnpm check` geçti.
- [ ] iOS ve Android geliştirme derlemesi; en az bir gerçek telefonda giriş/seçim/
  çıkış kanıtı var. Diğer platformun gerçek cihaz kabulü pilotta ayrıca izlenir.
- [ ] Sonuç commit/cihaz/platform/ortam/senaryo ile kaydedildi; durum/hafıza güncel.

## Ayrı işler ve geri dönüş

WebView köprüsü, push, mini player/ses, PDF, chat, ödevler ve ana sayfa bu brief'te
uygulanmaz. WebView native oturumu kendiliğinden paylaşmaz; köprü ayrı kabul ister.
Üyelik fixture'ları izole ortamda; gerçek ikinci üyelik ayrı yetkili işlemdir.
Kod geri dönüşü ilgili kod ve belge commit'leridir. Mevcut web davranışı test edilir;
DB/harici dosya göçü bu işin parçası değildir.

## Sonuç kaydı

4 Eylül: ilk kapsam envanteri hazırlandı.
5 Eylül, WF-003: eski 003 engeli kaldırıldı; minimum davet/limit sonrası çalışan
giriş/koro seçimi odağıyla brief güncellendi. Ürün kurulumu ve cihaz testi yapılmadı.

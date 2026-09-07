# Aktif bağlam

Güncelleme: 6 Eylül 2026. 003 tenant sınırı ve 005 çoklu üyelik/aktif koro
sözleşmesi canlıda.

## Şimdiki odak

[WF-003](../docs/briefs/WF-003-mobil-teslim-odagi.md) ile kullanıcı mobil teslim
odağını onayladı. 6 Eylül [WF-004](../docs/briefs/WF-004-english-agent-handoff.md)
ve karar #21 ile [plan](../docs/mobil-teslim-plani.md): minimum 008 davet kabulü
→ 004 giriş/koro seçimi → repertuvar/PDF → cihaz pilotu. Limit mağaza öncesinde;
somut pilot engeli yoksa native başlangıcını bekletmez.
008 yerel paketi hazır: 155 test, 20 tarayıcı testi ve izole DB regresyonları geçti.
[Kabul ve sınırlar](../docs/briefs/008-davet-ve-uyelik.md): canlı DB/deploy kabulü
henüz yok; sıradaki iş 010 canlı preflight ve kontrollü kabul, ardından 004.
[009 Auth e-postası](../docs/briefs/009-auth-eposta-ve-yanit.md) kapsamında custom
SMTP ve production Site URL ayarlandı; `team@mail.genesinovachoir.com` yanıtları
değiştirilebilir server ayarıyla işletmeci Gmail adresine aktarılıyor. Edge v3 ve
canlı teslim/idempotency kabulü geçti. MCP hâlâ yetkisiz; CLI yalnız doğrulanan
Genova ref'iyle kullanıldı. Erişilebilirlik çıktısında görünen ilk Full access
Resend anahtarı silindi; kayıtlı ikinci anahtar sır olarak korunuyor ve silme
sonrası Gmail gelen kutusu testi geçti.
Gerçek Supabase Auth doğrulama/recovery teslimi ayrıca kabul edilmeli.


[007 koro oluşturma](../docs/briefs/007-operator-kontrollu-koro-olusturma.md)
canlı altyapı olarak hazırdır. Taze backup/restore, kesin DB migration
`20260905160539`, hosted 003/005/006/007 testleri ve `create-choir` Edge v1 geçti.
Allow-list boş; gerçek operatör ataması veya gerçek koro oluşturma yapılmadı.
Authenticated başarı yolu ilk operatör ayrı yetkiyle seçildiğinde tamamlanacak.

[006 üyelik yönetimi güvenlik kapısı](../docs/briefs/006-uyelik-yonetimi-guvenlik-kapisi.md)
kapatıldı. Eski public bootstrap silindi, authenticated ana-veri DML'i kilitlendi,
testler ve salt kurtarma denetimi geçti. Ürün sahibi 27 hesabın mevcut parola/oturum
riskini açıkça kabul ederek toplu düzeltme ve e-posta adımını kapsamdan çıkardı;
parolaların güvenli hâle getirildiği iddia edilmez.

[005 çoklu üyelik ve aktif koro](../docs/briefs/005-coklu-uyelik-aktif-koro.md)
tamamlandı ve canlıya alındı. DB `20260905003154`, Edge v15, web `0a2b94c`;
taze restore, hosted 005 + 003 izolasyonu ve tek üyelikli gerçek oturum duman testi geçti.
Gerçek ikinci üyelik/seçici ile canlı write/delete henüz denenmedi.

[004 RN kabuk ve native giriş](../docs/briefs/004-rn-kabuk-ve-giris.md) 6 Eylül'de
yerel olarak uygulandı: `apps/mobile/` Expo SDK 57 ürün alanı, giriş, güvenli oturum
saklama, sıfır/tek/çok üyelik çözümü, sunucu doğrulamalı koro seçimi, koro değişiminde
cache temizliği ve çıkış. Kapılar ürün sahibinin Mac'inde doğrulandı: temiz `npm ci`
sonrası `npx tsc --noEmit && npm test` (35 test) ve `pnpm check` uçtan uca
(190 test + `next build`). 6 Eylül'de `npx expo run:ios` ile kendi iOS derlememiz üretilip
simülatörde (iPhone 17 Pro, iOS 26.5) çalıştırıldı; dört senaryo (yanlış parola, tek
üyelikte otomatik koro, yeniden açmada oturum, çıkış) hem Expo Go'da hem kendi
derlememizde elle geçti.
Metro çözümleme hatası (`disableHierarchicalLookup` yüzünden `expo-asset` bulunamıyordu)
`dc5f7a6` ile düzeltildi; `npm run bundle:check` CI'a eklendi.
Android derlemesi, gerçek telefon (donanım) ve CI koşusu yapılmadı.
The 7 September count audit found 22 PASS / 27 required rows already in the table;
five remain NOT RUN. The earlier 21/26 summary was an arithmetic error, not a scope change.
004 remains partial/pending. Ürün sahibinin Android
telefonu var ancak gerçek cihaz testini ertelemeyi seçti ve brief'in yeniden
kapsamlandırılmamasını istedi; kriterler yerinde duruyor. `apps/mobile/node_modules` macOS ile ajanın
Linux VM'i arasında paylaşıldığı için yetkili kurulum macOS'tur; ajan orada `npm install` çalıştırmaz. 005 sözleşmesi `lib/choir-context-core.ts` ile ortaklaştırıldı;
web davranışı değişmedi. 010 canlı yayın ve kabul hâlâ açık.
Kalıcı WebView oturum köprüsü, push ve ses ayrı işlerdir.

[WF-001](../docs/briefs/WF-001-ai-calisma-duzeni.md): iki video, kaynak repo ve
13 ekran görüntüsündeki yöntem Genova'ya uyarlandı. Altı kısa hafıza dosyası,
güncel ajan kuralları ve tekrar kullanılabilir brief/devir/proje profili hazır.
Belge kontrolleri ve `pnpm check` geçti; ayrıntılı sonuç WF-001'de.
Bu iş ürün fazlarının numarasını veya `003`'ün durumunu değiştirmez.

## Korunan kararlar

RN + Expo, aynı depo, ortak anotasyon sözleşmesi ve kalıcı WebView sınırları korunur.
Eski Flutter talimatları aktif giriş noktalarından temizlenir; spike geçmişi silinmez.
Alt ajanlar sınırlandırılmış görevle çalışır; aynı çalışma ağacında tek yazıcı vardır.
Hafif model seçimi ile ajan sayısı farklıdır; ölçülmemiş tasarruf iddiası yapılmaz.

## Sonraki ürün işi için durma noktaları

- 005 canlıdır. Gerçek ikinci üyelik, koro oluşturma ve davet/üyelik akışı ile kabul
  testleri tamamlanmadan eklenmez; altyapının varlığı ürün yönetim ekranı değildir.
- Şirket adı daha sonra eklenecek; 005 teknik kesimini veya RN kurulumunu engellemez.
  Mağaza/satıcı kimliği gereken adımlarda yeniden ele alınır.
- Minimum davet kabulü sonrası mobil akışa geç; yeni altyapı için somut engeli yaz.
  Native sınır [004 brief'inde](../docs/briefs/004-rn-kabuk-ve-giris.md) kayıtlıdır.
- Kullanıcı hosting ve PDF/ses deposu yönünü değerlendirmek istiyor.
  [Altyapı kaydı](../docs/altyapi-2026-09-04.md) staging hazırlığını anlatır;
  Drive'dan çıkış ve production taşıması tamamlanmış değildir.
- İlk açık ürün işi davet/üyelik (`008/010`), ardından 004'tür.
  Dosya sağlayıcısı ayrı iş; ilk cihaz denemesinin otomatik önkoşulu değildir.
  İlk gerçek koro işlemi öncesinde platform operatörü ayrıca seçilip yetkilendirilir;
  bu adımlar ayrı brief/işlem olarak yürütülür. Kendiliğinden DB göçü, DNS değişimi,
  ücretli plan veya push başlatılmaz.

## English session handoff

[agent-handoff.md](../docs/agent-handoff.md) is the entry point and was refreshed on
7 September 2026 from `10b6f9f`. It carries the startup message, the source order, the
separation of deployed / locally verified / unverified work, the tests actually run with
their environments and limits, the open blockers, the authorization boundary and the next
bounded task. Read it there rather than duplicating it here.
New agent-facing handoff and acceptance records use English; user updates remain Turkish
(decision #22). Use evidence per required criterion, not subjective scoring. Required
unrun/failed checks keep a brief pending. Existing CI is not a guarantee of model
compliance, and it has never executed for the current revision.

Tarihsel ayrıntılar [progress.md](progress.md)'deki kanıt bağlantılarındadır.
Devirde sadece değişen özet/bağlantıları güncelle; tüm dosyaları yeniden yazma.

## Direct macOS verification — 7 September 2026

At `10b6f9f`, the native type/test/bundle gate passed: 35 tests and a 660-module iOS
Hermes export. [004 evidence](../docs/briefs/004-rn-kabuk-ve-giris.md) contains the
environment, command and transcript. No product file changed or device/live check ran.
Next: coordinate the owner-assisted Android build prerequisites; Android Studio/default
SDK and generated Android project are absent at the checked paths. Phone/keychain testing
stays postponed until the owner chooses to resume; real-account authority remains separate.
010 stays pending; repertoire/PDF cannot begin before 004 acceptance.

## Android acceptance follow-up — 7 September 2026

At `6d64d16`, the own Android debug APK built and ran on a dedicated API 36 ARM64 emulator.
Signed-out UI and empty-form validation passed with synthetic loopback settings; no real
account or hardware. [Evidence](../docs/briefs/004-android-build-2026-09-07.md).
This supersedes the earlier absent-SDK/Android-not-run snapshot: the existing Homebrew SDK
and Java 17 were reused, emulator/image added. Current 004 count: 23/27 PASS, four NOT RUN
(hardware keychain, real-phone account flow, remote CI, 010). Ask before resuming postponed
hardware testing; repertoire/PDF stays blocked. No product source or live state changed.

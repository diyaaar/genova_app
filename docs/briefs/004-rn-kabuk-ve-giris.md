# 004 — RN kabuk ve native giriş hazırlığı

**Durum / tarih / sorumlu yazıcı:** Hazırlık brief'i; uygulama başlamadı. 4 Eylül 2026,
ana ajan tek yazıcı.

**Amaç (tek cümle) ve kullanıcı ihtiyacı:** Üst geçiş kapıları tamamlandığında aynı
depodaki Expo ürün alanında, kullanıcının güvenli biçimde giriş yapıp rolüne göre beş
temel sekmeli native kabuğa ulaşmasını sağlayacak en küçük işi sınırlandırmak.

**Başlangıç kanıtı:**

- **Doğrulanmış:** 002 RN/PDF spike'ı geçti; hedef React Native + Expo ve kalıcı
  WebView sınırları `MIGRATION.md` ile kararlı.
- **Doğrulanmış:** 003'ün taze yerel yedek/migration/izolasyon/down kanıtı geçti,
  fakat hosted DDL, uyumlu web/Edge yayını ve gerçek üyeli akış henüz yapılmadı.
  Ayrıntı: [`003-dogrulama.md`](003-dogrulama.md).
- **Doğrulanmış:** Ürün Expo alanı yok; `pnpm-workspace.yaml` ürün paketi tanımlamıyor.
  `spike/repertuvar-rn/` tarihsel denemedir, ürün kodu veya import kaynağı değildir.
- **Açık karar:** Çok-korolu ürün (koro kaydı, davet, plan/limit ve çoklu üyelik)
  mağazadan önce gelecek; bu ürün işi henüz ayrı brief'lere ayrılmadı. Bu brief sırayı
  değiştirmez.

**İzinli dosyalar / modüller:**

Bu hazırlık turunda yalnız bu brief ve ilgili hafıza indeksleri güncellenir. Uygulama
turunda, ön koşullar yeniden kanıtlandıktan sonra sınır ayrıca doğrulanır; beklenen alan
aynı depoda yeni ürün çalışma alanı, onun testleri ve gerekli kök çalışma alanı ayarıdır.
Mevcut web ekranları, Capacitor, `supabase/` ve `spike/` bu brief'in yazım alanı değildir.

**Kaynaklar / mevcut desen:**

- [`MIGRATION.md`](../../MIGRATION.md): native/WebView hedefi ve üst faz sırası.
- [`KARARLAR.md`](../../KARARLAR.md) #3, #7, #9–11: aynı depo, RN + Expo ve
  çok-korolu ürünün mağazadan önce gelmesi.
- [`002-rn-pdf-spike.md`](002-rn-pdf-spike.md): ürün alanı kurulurken yeniden
  doğrulanacak kurulum/cihaz öğrenimleri.
- `components/AuthProvider.tsx`: mevcut Supabase oturumu, üye/rol çözümü ve çıkışta
  kullanıcıya özel önbellek temizleme davranışı; tarayıcı bileşeni olarak taşınmaz.
- `app/(main)/layout.tsx`, `components/BottomNav.tsx`, `components/AppProviders.tsx`:
  korunacak oturum koruması, beş hedef ve tema niyeti; DOM/Next uygulaması taşınmaz.
- `components/NotificationPrompt.tsx`, `components/FloatingMiniPlayer.tsx` ve
  `store/useMiniAudioPlayerStore.ts`: push/sesin ayrı platform işleri olduğunu göstermek
  için okunur; bu işte yeniden kullanılacağı varsayılmaz.

**Geçiş başlangıç kontrolü** — [geçiş rehberi](../gecis-rehberi.md).

- **Okunan talimatlar, kararlar ve mevcut kanıtın yolları:** `AGENTS.md`, altı
  `memory-bank/` kaydı, `docs/ai-calisma-duzeni.md`, `docs/gecis-rehberi.md`,
  `MIGRATION.md`, `KARARLAR.md`, 002/003 brief'leri ve 003 doğrulama kaydı.
- **Tek ekran / altyapı işi; native / WebView / ortak mantık / backend sınırı:**
  Gelecekte tek uygulama işi native giriş + temel kabuktur. Duyurular, koristler,
  profil/değişiklik talepleri ve devamsızlık kalıcı WebView'dır; bu işte yazılmaz.
  Yeni API, Edge Function, DB veya ortak anotasyon sözleşmesi değişikliği yoktur.
- **Korunacak mevcut davranış, ortak sözleşme ve web etkisi:** Oturumsuz erişim
  korunur; girişte üyelik/rol çözülür; çıkıştan sonra korumalı oturum/veri geri dönmez.
  Web ile piksel eşitliği hedef değildir. WebView'ın native Supabase oturumunu otomatik
  paylaşacağı varsayılmaz; bu köprü ayrı brief'tir.
- **İzinli dosyalar, tek yazıcı ve bu iş için verilmiş kullanıcı yetkisi:** Kullanıcının
  geçişe başlama talimatı hazırlık ve yerel planlama için yeterlidir. Canlı DDL, push,
  deploy, hesap/harcama ve yeni ürün kodu için bu brief tek başına yetki vermez. Ortak
  çalışma ağacında ana ajan tek yazıcıdır; alt ajanlar salt-okuma envanterle sınırlıdır.
- **Gerekli testler, ortamları, geri dönüş ve çözülmemiş çelişkiler:** Uygulama başlamadan
  önce güncel Expo kurulum belgeleri ve çalışma alanı kararı doğrulanır. Uygulamada RN
  alanında `npx tsc --noEmit && npm test`, kökte `pnpm check`, yetkili iOS/Android
  geliştirme derlemesi ve temel cihaz akışı gerekir. 003 hosted kanıtı ve çok-korolu
  ürün kapsamı olmadan uygulama başlatılmaz.

**Kapsam dışı** — bu görevde kesinlikle yapılmayacaklar:

- 003 canlı şema göçü, GitHub push, web/Edge deploy veya production testleri.
- Çok-korolu koro kaydı, davet, plan/limit, ödeme veya çoklu üyelik kararını kodlamak.
- WebView oturum aktarımı, geri navigasyon, harici bağlantılar ve çıkıştaki web
  önbellek temizliği; bunlar ayrı kabul sözleşmesi gerektirir.
- Push (VAPID/FCM/APNs), mini player/ses, repertuvar/PDF, chat, ödev veya ana sayfa
  veri akışları.
- Mevcut Next.js/CSS/DOM kodunu RN'e kopyalamak, Capacitor'ı değiştirmek veya
  kalıcı WebView ekranlarını native yeniden yazmak.

**Risk / yetki / geri dönüş:**

- 003 canlıya çıkmadan native giriş eski şemaya yanlış bağımlılık kurabilir; önce aynı
  sürüm web/Edge/DB geçişi ve gerçek üyeli doğrulama tamamlanır.
- Çok-korolu ürün sırasını sessizce atlamak üyelik, rol ve koro seçimi sözleşmesini
  sonradan kırabilir. Yeni ürün kararı gerektiğinde kod yerine kullanıcı yönlendirmesi
  istenir.
- Tarayıcıya özgü `window`, DOM, Service Worker, `HTMLAudioElement` ve `localStorage`
  davranışları platform uyarlaması olmadan taşınmaz. WebView oturum aktarımı ayrı risk
  olarak kapatılana kadar WebView ekranı uygulamaya eklenmez.
- Bu hazırlık değişiklikleri yalnız belgedir; geri dönüş `git revert` ile mümkündür.
  Veri/yayın geri dönüşü bu brief'in dışındadır.

**Küçük uygulama adımları:**

1. 003'ün canlı geçiş/yayın/hosted izolasyon ve gerçek üyeli akış kapılarını açık
   bakım aralığında tamamla; sonucu bu brief'e değil 003 kanıtına kaydet.
2. Çok-korolu ürünün koro kaydı, davet, plan/limit ve çoklu üyelik kararlarını ayrı,
   küçük brief'lere böl ve kabulünü tamamla.
3. Yeni uygulama turunda ürün çalışma alanı yolu, paket yöneticisi ve güncel Expo
   bağımlılıklarını doğrula; spike'ı import etmeden dar ürün alanını kur.
4. Native oturum/üyelik-rol çözümü, beş sekmeli kabuk ve tema için platform uyarlamalarını
   yaz; ardından RN, web ve gerçek cihaz kapılarını ayrı kanıtla.

**Bitti tanımı** — hepsi kanıtlanmadan uygulama işi kapanmaz:

- [x] Başlangıç envanteri, kalıcı WebView sınırı ve uygulama dışı alanlar kayda geçti.
- [ ] 003'ün hosted geçişi, uyumlu web/Edge yayını, hosted izolasyon ve gerçek üyeli
  akış kanıtı tamamlandı.
- [ ] Çok-korolu ürünün mobil kabuktan önceki karar/brief kapısı tamamlandı.
- [ ] Oturumsuz kullanıcı native girişte kalır; başarılı girişte üyelik ve rol çözülerek
  kabuğa geçer; çıkıştan sonra korumalı yerel veri/oturum geri dönmez.
- [ ] Beş sekmenin hedefi/seçili durumu ve açık/koyu tema çalışır; piksel eşitliği aranmaz.
- [ ] RN ürün alanında `npx tsc --noEmit && npm test`, kökte `pnpm check`, ayrıca iOS ve
  Android geliştirme derlemesi/temel cihaz akışı kanıtlandı.
- [ ] Push, ses, WebView ve yayın için çalıştırılmayan katmanlar açıkça bekliyor kalır;
  diff kapsam dışına çıkmaz, ilgili hafıza ve ekran durumu günceldir.

**Sonuç kaydı:**

| Tarih | Komut / işlem | Ortam | Sonuç | Kanıt / sınır |
|---|---|---|---|---|
| 4 Eyl 2026 | Salt-okuma login/kabuk/WebView envanteri | Yerel kaynak incelemesi | Hazırlık tamam | Expo ürün alanı yok; 003 canlı ve çok-korolu ürün kapıları açık |

**Teslim:** Bu belge yalnız doğru sonraki native işin sınırını kaydeder. Kalan risk:
003 canlı geçişi ve çok-korolu ürün kararları. Sıradaki tek adım 003'ün açık canlı
geçiş kapıları için açık yetki ve koordinasyon sağlamaktır.

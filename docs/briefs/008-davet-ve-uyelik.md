# 008 — Minimum davet ve üyelik

6 Eylül 2026. UYGULAMADA; ana ajan tek yazıcı. Başlangıç: temiz main, 45967a7.
Kullanıcı uygulama istedi; bu tur yerel kod/test, migration ve geri dönüş hazırlığıdır.
Canlı DB/Edge/web kesimi, gerçek hesap/üyelik ve e-posta gönderimi yapılmaz.

## Tek sonuç ve sözleşme

Şef aktif korosuna e-posta, ad/soyad ve ses grubu ile Korist daveti oluşturur;
bağlantıyı kopyalar. Alıcı mevcut hesabıyla giriş yapar veya kendi parolasıyla
Auth kaydı açıp e-postasını doğrular; bağlantıyı yeniden açarak kabul eder.
Yeni hesap kaydı tek başına koro üyeliği vermez. Hesap doğrulama e-postası Auth'a
aittir; bu geliştirme turunda gerçek e-posta tetiklenmez.

- Davet 7 gün geçerli; kriptografik rastgele token yalnız oluşturma yanıtında.
  DB'de yalnız SHA-256 özeti; link fragment'inde taşınır, URL sorgusunda/logda tutulmaz.
- Aynı alıcıya yeniden oluşturma eski bekleyen daveti iptal eder; link geri okunmaz.
- Şef yalnız aktif koroyu yönetir; istek koro kimliği sunucudaki seçime eşit olmalı.
  Partisyon Şefi ve Korist davet yönetemez. Kabul rolü daima Korist.
- Kabulde aktif Auth oturumu, doğrulanmış güncel e-posta, davet süresi/durumu ve
  davet edenin hâlâ aynı koroda aktif Şef olması kontrol edilir.
- Üyelik + rol + davetin tüketimi atomik; eşzamanlı/tekrar kabul, yanlış hesap,
  iptal/süre aşımı reddedilir. Mevcut veya pasif üyelik otomatik yükseltilmez/açılmaz.
- 006 DML kilidi korunur. Gerekli ayrıcalıklı DB işlemi açık yetki kontrolleriyle
  sınırlıdır; istemci/Edge service-role kullanmaz. 003 tetikleyici uyumu test edilir.

## Kaynak ve başlangıç kontrolü

AGENTS, altı hafıza, çalışma döngüsü, geçiş rehberi, mobil teslim planı, kararlar,
005/006/007 sözleşmeleri, AuthProvider, login ve korist listesi kaynakları.
Supabase Auth/signup, Edge authorization ve Postgres yetki/kilit rehberleri.
Yeni Auth hesabı akışı deployment öncesi shared-project Auth ayarlarıyla doğrulanır.

İzinli alanlar: bu brief ve durum/hafıza; 008 migration/down/SQL testleri;
supabase/functions/choir-invitations ve config; lib/choir-invitations.ts/test;
components/invitations; app/invite ve app/(main)/koristler davet bağlantısı/sayfası.
UI, sunucu, DB ayrı sorumluluk taşır. Native, plan-limit, toplu davet, ödeme,
Şef devri, hosting/dosya göçü ve eski hesap kurtarması kapsam dışıdır.

## Kabul

- [ ] Oluştur/listele/iptal/kabul; yetkisiz rol/koro, yanlış/doğrulanmamış hesap,
  süre/iptal/tekrar ve atomiklik testleri izole restore üzerinde geçti.
- [ ] 003/005/006/007 regresyonları ve 008 down tekrar uygulama geçti.
- [ ] Web yönetim ve kabul ekranı, yeni/mevcut kullanıcı akışı, hata/yoğunluk durumu hazır.
- [ ] Edge istek/auth/hata sözleşmesi ve web testleri; pnpm check geçti.
- [ ] Diff ve devir kaydı; canlı/provider/cihaz doğrulanmayan katmanları açık.

Geri dönüş: önce web girişini kaldır, Edge'i geri al, 008 down uygula; kabul edilmiş
üyelikler silinmez. Canlı kesim öncesi taze backup/restore ve iki proje etkisi gerekir.
Sıra: DB → Edge → web; önceki sürümler yeni akışa bağımlı değildir.

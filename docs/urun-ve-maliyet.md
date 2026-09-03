# Maliyet ve Katmanlı Ürün Kararları

## Sunucu kiralaman gerekmiyor

Mimari zaten sunucusuz: **Supabase** (Postgres + Auth + Realtime + Storage + Edge Functions)
+ Flutter istemci. Kiralanacak, yamalanacak, yeniden başlatılacak bir makine yok.

Üstelik Flutter ekranları kapsadıkça **Next.js sunucusu tamamen kalkabilir** — yani geçiş
maliyeti artırmıyor, azaltıyor. Sunucu mantığı Edge Function'lara taşındığında geriye
sadece Supabase kalır.

## Maliyet

| Kalem | Bugün (tek koro) | Ticari |
|---|---|---|
| Supabase Free — 500 MB DB, 1 GB depolama, 50k aylık aktif kullanıcı | $0 | — |
| Supabase Pro — 8 GB DB, 100 GB depolama, 250 GB trafik | — | $25/ay |
| Apple Developer Program | $99/yıl (~$8/ay) | $99/yıl |
| Google Play Console | $25 (tek sefer) | $25 |
| FCM push | $0 | $0 |
| Alan adı | ~$15/yıl | ~$15/yıl |
| Vercel (web'i tutarsan — Hobby ticari kullanıma kapalı) | $0 | $20/ay |
| **Toplam** | **~$8–10/ay** | **~$35–55/ay** |

Supabase'in bir üst katmanı Team ve $599/ay — oraya bir süre ihtiyacın olmaz.

### Maliyeti asıl büyüten şey: ses ve PDF

Kaba hesap, 30 kişilik bir koro: 30 üye × ayda 4 kayıt × 5 MB ≈ **600 MB/ay**, yılda ~7 GB.
Her kayıt 3 kez dinlenirse ~1,8 GB/ay trafik. Pro'nun 100 GB depolama / 250 GB trafiğinde
tek koro rahat rahat sığar. **20 koroda** depolama yılda ~140 GB'a çıkar ve Pro'yu aşar —
aşım GB başına ücretlendirilir, felaket değil ama fiyatlamana bunu yansıtman gerekir.

> **Risk:** Dosyalar şu an **Google Drive**'da (`drive-manager-v2`, `drive_file_id`, imzalı
> proxy). Tek koro için idare eder; ticari üründe kırılgan — kota, OAuth yenileme ve
> "kimin Drive'ı" sorusu. Ticarileşme kararı verilirse dosyalar Supabase Storage'a
> (veya S3 uyumlu bir depoya) taşınmalı.

---

## Katmanlı ürün — şimdi alınması gereken iki karar

Katman fikri (beta 4 kişi / 30 kişi / pro özellikler) uygulamayı **tek korodan çok koroya**
taşıyor. Bu, sonradan eklenmesi pahalı olan iki şey demek.

### 1. Çok kiracılılık (multi-tenancy) — ŞİMDİ, sonra değil

Şemada **hiçbir kiracı kavramı yok.** `choir_id`, `organization_id`, `tenant_id` — hiçbiri.
Tüm tablolar tek koro varsayımıyla yazılmış.

Canlı veri ve yayınlanmış bir uygulama varken her tabloya `choir_id` ekleyip tüm RLS
politikalarını yeniden yazmak acı verici bir göç. Faz 1 başlamadan eklemek ise neredeyse
bedava. **Katmanlı ürünü ciddi düşünüyorsan bu kolon Faz 1'den önce girmeli** — faturalama,
plan yönetimi, yükseltme ekranı hepsi bekleyebilir, bu bekleyemez.

### 2. Limitler sunucuda — istemcide asla

"Sınıfa en fazla 4 kişi", "aynı anda tek XML" gibi kurallar **Postgres tarafında** olmalı:
RLS politikası veya Edge Function kontrolü. Flutter tarafında kontrol edilirse birkaç
dakikada aşılır. Limitler koda gömülmemeli, plan tablosundan okunan **veri** olmalı —
böylece plan değiştirmek yeni sürüm yayınlamayı gerektirmez.

---

## Faturalama: Apple'ın kesintisi kaçınılmaz

Kullanıcı **uygulama içinde** Pro'ya geçiyorsa, ödeme Apple'ın kendi satın alma sistemiyle
yapılmak zorunda. Stripe, iyzico veya kendi ödeme sayfan **kullanılamaz** — ret sebebi.

- Apple: **%30**, Small Business Program'a kayıtlıysan (yıllık gelir $1M altı) **%15**
- Google Play: ilk $1M için **%15**

**Meşru kaçış yolu — B2B:** Planı bireysel kullanıcıya değil **koroya** satarsan (koro
yönetimi web sitenden abone olur, uygulama sadece hakkı okur), uygulama içi satın alma
zorunluluğu doğmaz. Senin modelin zaten kurumsal — "sınıf/koro" satın alıyor, birey değil.
Bu yolu seçersen uygulama içinde fiyattan ve yükseltme bağlantısından hiç bahsedilmemeli;
Apple bunu da denetliyor.

---

## Öneri

1. **Tek koroyla yayınla.** Faturalama, planlar, yükseltme ekranı v1'de yok.
2. **Ama `choir_id`'yi şimdi ekle** ve RLS'i ona göre yaz. Tek ucuz-şimdi / pahalı-sonra karar bu.
3. **Limitleri plan tablosundan oku**, koda gömme.
4. Faturalamayı **ikinci koro para ödemek istediğinde** yap — önce değil.

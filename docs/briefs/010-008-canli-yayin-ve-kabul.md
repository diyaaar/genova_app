# 010 — 008 canlı yayın ve kontrollü kabul

6 Eylül 2026. Durum: planlandı; canlı 008 işlemi başlatılmadı. Ana ajan tek yazıcı.

## Tek sonuç

Yerelde hazır olan 008 davet/üyelik akışını paylaşımlı Genova production ortamına
DB → Edge → web sırasıyla yayımla; gerçek Auth e-postası ve kontrollü test
kimlikleriyle oluşturma, iptal ve atomik kabulü uçtan uca kanıtla.

## Doğrulanmış başlangıç

- Planlama öncesinde `main`, `origin/main` önünde dokuz commit; bu brief ayrı bir
  plan commit'i olarak eklenecek. Üretim `app.genesinovachoir.com`
  Vercel'de; `main` push'u yayın tetikleyebilir ve sıradan Git senkronu sayılmaz.
- 008 yerel migration'ı `20260905210953_choir_invitations_008.sql`; down, SQL,
  concurrency, Edge ve web testleri hazır. Canlı DB migration ve `choir-invitations`
  Edge deploy yok.
- 009 tamamlandı: custom SMTP, production Site URL, imzalı yanıt yönlendirme ve
  Gmail teslimi canlı kabul edildi. Gerçek Supabase Auth doğrulama teslimi 008'de yapılır.
- Kesin proje `hievmwwctjjlhmssoxsu`. MCP yetkisiz kalıyor; CLI proje erişimi doğru.
  Doğrudan DB hostuna son salt-okunur migration-list isteği IPv6/5432 timeout verdi;
  bu nedenle yazmadan önce desteklenen IPv4 session-pooler bağlantısı doğrulanmalı.
- Free plan panel yedeği yok. Şema değişiminden önce yeni mantıksal schema + data
  yedeği, hash ve ayrı PostgreSQL 17 restore kanıtı zorunlu.

## İzinli alan ve durma noktaları

İzinli yayın paketi: kesin 008 migration/down/testleri, `choir-invitations` Edge,
008 web commit'leri ve buna bağlı 009/planlama commit'leri. Bulguyu düzeltmek için
gereken en küçük 008 değişikliği ayrı test ve commit ister. Plan-limit, RN, hosting,
Drive, 27 eski hesap, gerçek koro yönetimi ve toplu üyelik kapsam dışıdır.

Canlı kabulten önce kullanıcı şu geçici veriyi açıkça seçer/onaylar: yalnız test
için adlandırılmış bir koro/Şef ve işletmeciye ait davet alıcısı; test sonunda hangi
Auth/üyelik/koro kayıtlarının silineceği. Mevcut üretim korosu veya 27 hesap sessizce
kullanılmaz. Test verisi silme ayrı, hedefleri listelenmiş onaylı işlemdir.

## Uygulama sırası

1. **Salt okunur preflight:** kesin proje/organizasyon, aktif migration ve Edge
   sürümleri, live şema varsayımları, Vercel-Git bağlantısı ve temiz ağaç doğrulanır.
   Pooler bağlantısı kurulamazsa canlı iş durur.
2. **Geri dönüş kanıtı:** canlı schema/data mantıksal yedeği alınır; SHA-256 ve
   güvenli konumu kaydedilir. Taze yerel PostgreSQL 17'ye restore edilir; tablo ve
   kritik kayıt sayıları kaynakla eşleştirilir.
3. **Taze restore kabulü:** yalnız 008 migration uygulanır; 003/005/006/007/008,
   concurrency ve gerçek down roundtrip yeniden geçer. Kabul edilmiş üyeliğin down
   ile silinmediği korunur.
4. **Canlı DB:** toplu `db push` yok; yalnız kesin 008 SQL uygulanır ve migration
   geçmişi işlenir. Hosted testler transaction + `ROLLBACK` ile çalıştırılır;
   davet tablosu/RPC yetkileri ve mevcut kayıt sayıları yeniden okunur.
5. **Edge:** `choir-invitations` `verify_jwt=true` ile deploy edilir. CORS,
   imzasız/anon/yanlış koro ve güvenli hata yolları canlı kontrol edilir.
6. **Web:** DB ve Edge hazır olduktan sonra doğrulanmış 008/009 ve plan commit'leri
   `origin/main`a gönderilir.
   GitHub CI, Vercel production deployment ve canlı domain ayrı ayrı doğrulanır;
   commit/push/deploy birbirinin kanıtı sayılmaz.
7. **Kontrollü ürün kabulü:** test Şefi davet oluşturur/listeler/iptal eder; yeni
   alıcı kendi parolasıyla kayıt olur, gerçek Auth e-postasını doğrular ve daveti
   yeniden açıp kabul eder. Yanlış hesap, kullanılmış/iptal link ve tekrar kabul
   reddedilir; doğru koro/rol görünür. Masaüstü ve mobil viewport kontrol edilir.
8. **Temizlik ve kapanış:** önceden listelenmiş test kayıtları onaylı sırayla
   temizlenir; production kayıt sayıları ve davet endpoint'i tekrar kontrol edilir.
   Kanıtlar 008/010 ve kısa hafıza özetine yazılır.

## Geri dönüş

Web önce önceki Vercel deployment'a alınır; Edge önceki sürüme döndürülür/devre dışı
bırakılır; sonra 008 down uygulanır. Down kabul edilmiş üyelikleri silmez. Canlı
ürün verisi etkilenirse otomatik silme yok; restore kararı kapsam ve kullanıcı
onayıyla alınır. 009 SMTP/yönlendirme bu geri dönüşte değiştirilmez.

## Kabul

- [ ] Taze schema/data yedeği, hash, restore ve kaynak sayım eşleşmesi geçti.
- [ ] Taze restore 003–008, concurrency ve down roundtrip geçti.
- [ ] Kesin 008 canlı migration, hosted rollback testleri ve DB yetkileri geçti.
- [ ] Edge canlı güvenlik/CORS kontrolleri geçti.
- [ ] GitHub CI, Vercel deployment ve canlı domain aynı commit'i gösterdi.
- [ ] Gerçek Auth doğrulaması ile oluştur/iptal/kabul ve olumsuz yollar geçti.
- [ ] Onaylı test verisi temizlendi; kapsam dışı üretim verisi değişmedi.

## Sonraki tek adım

6 Eylül, karar #21: 010 kabulünden sonra 004 Expo ürün alanı kurulur; ardından
repertuvar/PDF ve cihaz pilotu gelir. Plan-limit mağaza öncesinde tamamlanır; yalnız
ölçülmüş pilot engeli gerekli en küçük parçayı öne alabilir. 010 dış erişim/yetki
nedeniyle beklerse bağımsız, onaylı 004 yerel işleri ilerleyebilir; 010 kapanmış sayılmaz.

## Salt okunur preflight sonucu — 7 Eylül 2026

Uygulama sırasının 1. adımı (salt okunur preflight) büyük ölçüde tamamlandı. Aşağıdakilerin
tamamı **okuma**dır: hiçbir migration uygulanmadı, fonksiyon dağıtılmadı, SQL çalıştırılmadı,
ayar veya veri değiştirilmedi. Bu kayıt 010'u başlatmaz; yalnız önkoşulları ölçer.

Agent-facing detail is in English below, per decision #22.

| Check | Source | Result |
|---|---|---|
| Exact project | Supabase MCP `list_projects` | `hievmwwctjjlhmssoxsu`, `genesinovachoir's Project`, org `urpuzollmvvdkayavnhd`, Postgres 17, `ACTIVE_HEALTHY`. Matches the only project AGENTS permits |
| Applied migrations | `list_migrations` | 50 entries, newest `20260905160539` (007). **`20260905210953_choir_invitations_008` is absent** |
| Live Edge functions | `list_edge_functions` | `send-email`, `send-push-notification`, `drive-manager`, `drive-manager-test`, `drive-manager-v2` v19, `create-choir` v2, `resend-inbound` v3. **`choir-invitations` is absent** |
| Schema-level confirmation | `list_tables` on `public` | 38 tables, **every one RLS-enabled**, and **no `choir_invitations` table**. The migration is genuinely unapplied, not merely missing from the ledger |
| Live data present | same listing, aggregate counts only | Real member data exists — attendance and rehearsal-invitee rows in the hundreds, 79 repertoire files, 61 push subscriptions, 40 PDF annotations, 1 choir. This is production, not a scratch project |
| Web/Git link | Vercel `get_project`, `list_deployments` | `genova-app` serves `app.genesinovachoir.com` from branch `main`; production sits on `0389242`, identical to `origin/main`. Nothing from the unpushed history has shipped |
| Working tree | `git status`, `git worktree list` | Clean, single worktree, main agent is the only writer |

**Step 1 is therefore satisfied except for the supported write path.** The brief requires an IPv4
session-pooler connection to be proven before any write. That check cannot be performed from the
agent sandbox at all: DNS resolution for both `db.hievmwwctjjlhmssoxsu.supabase.co:5432` and the
pooler host fails, and `psql`, `pg_dump` and the Supabase CLI are not installed there. The sandbox
reaches Supabase only through the MCP HTTP API.

**Consequence for step 2, the backup.** A fresh logical schema + data backup, its SHA-256 and a
restore into a clean PostgreSQL 17 with matching row counts **cannot be produced by the agent**.
It needs the owner's machine, where the Supabase CLI or `pg_dump` can reach the database directly.
This is a capability limit, like the GitHub remote before it, not a missing permission.

**Consequence for step 7.** The brief itself requires the owner to name, in advance, the temporary
choir/chief and the operator-owned invitation recipient, and to say which Auth, membership and
choir records will be deleted afterwards. That decision has never been given. Existing users and
the 27 accounts covered by decision #17 are not substitutes.

**Status: 010 remains pending.** The access blocker that held it for days is gone — the correct
project is reachable and its preconditions are now observed rather than assumed — but the backup,
the restore evidence, the fixture decision and every write step are still outstanding, and none of
them may be inferred from general authorization. The next concrete action belongs to the owner:
produce the backup and restore evidence, and name the fixtures.

## Adım 2 hazırlığı — yedek prosedürü ve doğrulama temeli (7 Eylül 2026)

Yedek **sizin Mac'inizde** alınacak. Aşağıda gerekçesi, çalıştırılacak komutlar ve restore'u
mekanik hale getiren sayım temeli var. Bu bölüm bir hazırlıktır; yedek alınmadı, hiçbir şey
dağıtılmadı, 010 başlatılmadı.

### Neden ajan alamıyor — ölçülmüş engel, eksik izin değil

| Ortam | Bulgu |
|---|---|
| Ajan VM'i (kullanıcının makinesinde) | Proxy `api.supabase.com` ve `db.hievmwwctjjlhmssoxsu.supabase.co` için CONNECT'e 403 veriyor. `psql`, `pg_dump`, Supabase CLI kurulu değil ve npm ile kurulum başarısız oldu |
| Bulut konteyneri | DNS çözülüyor ama 5432 ve pooler 6543 kapalı. `db.*` yalnız IPv6 döndürüyor, pooler IPv4 döndürüyor; ikisine de TCP açılamıyor. Ayrıca oradaki `pg_dump` 16.13, sunucu Postgres 17 — sürüm uyuşmazlığı tek başına engel |

Supabase CLI'ı projeye eklemek bunu çözmez: engel binary değil, ağ. Ayrıca kök `package.json`'a
sadece araç için bağımlılık eklemek canlı web projesinin bağımlılık grafiğini ve lockfile'ını
değiştirir; bu iş için gereksiz bir yan etki olur.

### Mac'te çalıştırılacak komutlar

Bağlantı parolası Supabase panelinden alınır ve hiçbir yere yapıştırılmaz.

Superseded on the same day — see the result section below. `supabase db dump` runs pg_dump inside
Docker, which is not installed on the owner's machine, so the working route is Homebrew
`postgresql@17` and `pg_dump` directly. The dump must also cover more than `public`.

`backup_*.sql` kökte `.gitignore` kapsamındadır, Git'e girmez. Depodaki `backup_*_2026-09-04.sql`
dosyaları boş yer tutuculardır, kanıt değildir.

### Taze PostgreSQL 17'ye geri yükleme

```
docker run --rm -d --name genova-restore -e POSTGRES_PASSWORD=local -p 55432:5432 postgres:17
sleep 8
psql "postgresql://postgres:local@127.0.0.1:55432/postgres" -v ON_ERROR_STOP=1 -f backup_roles_$D.sql
psql "postgresql://postgres:local@127.0.0.1:55432/postgres" -v ON_ERROR_STOP=1 -f backup_schema_$D.sql
psql "postgresql://postgres:local@127.0.0.1:55432/postgres" -v ON_ERROR_STOP=1 -f backup_data_$D.sql
```

### Sayım karşılaştırması

Aynı sorguyu **hem canlıda hem restore edilmiş kopyada** çalıştırıp çıktıları karşılaştırın:

```sql
select t.table_name,
       (xpath('/row/cnt/text()',
              query_to_xml(format('select count(*) as cnt from %I.%I', t.table_schema, t.table_name),
                           false, true, '')))[1]::text::bigint as exact_rows
from information_schema.tables t
where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
order by t.table_name;
```

**7 Eylül 2026 referans anlık görüntüsü** (canlı proje, MCP `execute_sql`, salt okunur). Bu bir
referanstır, kabul ölçütü değil: üyeler uygulamayı kullandıkça sayılar değişir, bu yüzden asıl
karşılaştırma **yedeğin alındığı andaki** sayımla yapılmalıdır. Sapma varsa önce nedeni açıklanır.

| Tablo | Satır | Tablo | Satır |
|---|---:|---|---:|
| announcements | 4 | profile_change_requests | 9 |
| assignment_submission_audit_logs | 14 | push_subscriptions | 61 |
| assignment_submission_history | 0 | rehearsal_invitees | 536 |
| assignment_submission_private_notes | 10 | rehearsals | 21 |
| assignment_submissions | 10 | repertoire | 9 |
| assignment_targets | 11 | repertoire_cache_versions | 1 |
| assignments | 2 | repertoire_files | 79 |
| attendance | 536 | repertoire_pdf_annotations | 40 |
| chat_message_status | 0 | repertoire_song_comments | 2 |
| chat_messages | 27 | repertoire_song_tags | 0 |
| chat_notification_preferences | 0 | repertoire_tags | 0 |
| chat_poll_votes | 2 | roles | 3 |
| chat_polls | 1 | schools | 4 |
| chat_reactions | 0 | song_assignments | 213 |
| chat_room_members | 43 | subscribers | 3 |
| chat_rooms | 11 | choir_member_roles | 28 |
| chat_starred_messages | 0 | choir_members | 29 |
| collab_inquiries | 0 | choirs | 1 |
| contact_messages | 1 | departments | 15 |

38 tablo, toplam yaklaşık 1.700 satır. Küçük bir veri kümesi; yedek ve restore hızlı olmalı.

### Yedek dosyalarının içeriği hakkında

Dump'lar korist adları, e-posta ve telefonları, doğum tarihleri ve yoklama geçmişi içerir. Bu
dosyalar Mac'inizde kalmalı: sohbete yapıştırılmaz, depoya commit edilmez, ajan ortamlarına
taşınmaz ve devir kayıtlarına yazılmaz. Ajan yalnız SHA-256 değerini ve sayım karşılaştırmasının
sonucunu kanıt olarak kaydeder.

### Bundan sonra kalan

Yedek ve restore kanıtı geldiğinde 010'un 3. adımı (taze restore üzerinde 003–008, concurrency ve
down roundtrip) çalıştırılabilir. 7. adım için hâlâ **sizin** belirlemeniz gereken şey duruyor:
test korosu/şefinin adı, işletmeciye ait davet alıcısı ve test sonunda silinecek kayıtların
listesi. Bu, brief'in kendi şartı; genel yetkiden türetilmez.


## Adım 2 sonucu — yedek ve geri yükleme kanıtlandı (7 Eylül 2026)

Yedek ürün sahibinin Mac'inde alındı, taze bir PostgreSQL 17'ye geri yüklendi ve satır sayıları
canlıyla birebir eşleşti. Canlı ortamda hiçbir değişiklik yapılmadı; tüm canlı erişim salt okunur.

### İki düzeltilmiş varsayım

**`supabase db dump` kullanılamadı.** CLI 2.107.0 kurulu ve `link` çalıştı, ama `db dump`
pg_dump'ı Docker konteynerinde çalıştırıyor ve makinede Docker yok. İlk üç deneme sessizce
**boş dosya** üretti; hash'leri boş dosyanın SHA-256'sıydı. Çalışan yol: Homebrew
`postgresql@17` (pg_dump 17.11) ile doğrudan `pg_dump`.

**Yalnız `public` yedeklemek bu proje için geçersiz bir yedek.** Restore denemeleri sırayla
`schema "genova_003" does not exist` ve `schema "auth" does not exist` hatalarıyla durdu. Canlı
şema listesi (salt okunur) proje şemalarının `public` dışında da olduğunu gösterdi:
`genova_003`, `genova_005`, `genova_007` — 003/005/007 kiracı işlerinin bıraktığı şemalar — artı
migration defteri `supabase_migrations` ve `public`'in yabancı anahtarla bağlı olduğu `auth`.
Geçerli kapsam bu beşi içerir; `storage`, `realtime`, `vault`, `graphql`, `net` ve `extensions`
Supabase tarafından yönetilir ve bilinçli olarak dışarıda bırakıldı.

### Çalışan komutlar

```
pg_dump "$DB_URL" --schema=auth --schema=public --schema=genova_003 \
        --schema=genova_005 --schema=genova_007 --schema=supabase_migrations \
        -f backup_full_$D.sql
```

Geri yükleme öncesi hedef veritabanı [supabase/test-support/restore-prep.sql](../../supabase/test-support/restore-prep.sql)
ile hazırlanır: dump'ın atıfta bulunduğu rol adları ve `extensions` şeması + `pgcrypto`,
`uuid-ossp`. Homebrew Postgres rolleri makine kullanıcısıyla açtığı için `postgres` rolü yoktur;
bu dosya olmadan restore `role "postgres" does not exist` ile durur. Ayrıca yeni veritabanında
`public` şeması hazır geldiğinden dump'tan önce `drop schema public cascade` gerekir.

### Kanıt

| Öğe | Değer |
|---|---|
| Yedek dosyası | `backup_full_2026-09-07.sql`, 1.288.602 bayt, 12.540 satır |
| SHA-256 | `11b90c417ad2536ade3d5a07c684c56ab7282a59c3c705d766e54d325f406a8d` |
| Konum | Ürün sahibinin makinesi, `.gitignore` kapsamında. Depoya girmedi, ajan ortamlarına taşınmadı, içeriği okunmadı |
| Geri yükleme hedefi | Yerel PostgreSQL 17.11 (Homebrew), `genova_restore` veritabanı |
| Geri yükleme sonucu | `psql -v ON_ERROR_STOP=1` çıkış kodu **0** |
| Sayım karşılaştırması | `public` şemasında **38 tablo, 1.726 satır**; canlı ile **tam eşleşme**, fark yok |

Sayım her iki tarafta aynı `query_to_xml` sorgusuyla alındı. Canlı sayım geri yüklemeden hemen
sonra tekrarlandı, yani karşılaştırma yedek anına yakın; aradaki sürede uygulama kullanılmış olsaydı
fark görülürdü, görülmedi.

### Sınırlar

Bu, `pg_dump` kapsamındaki şemaların mantıksal yedeğidir. Auth kullanıcıları dahildir, ancak
Storage nesneleri, Drive'daki dosyalar, Edge Function kaynakları ve proje ayarları **dahil
değildir**; bunların geri dönüşü ayrı işlerdir. Geri yükleme temiz bir veritabanına yapıldı, canlı
projeye değil — canlı geri yükleme hâlâ ayrı bir karar ve ayrı bir onay ister.

### Sırada ne var

3. adım artık çalıştırılabilir: taze restore üzerinde 008 migration'ını uygulayıp 003–008
regresyonlarını, concurrency kabulünü ve gerçek down roundtrip'ini koşmak. Bu tamamen yerel bir
kopyada olacağı için canlı etkisi yoktur.

7. adım için hâlâ ürün sahibinin belirlemesi gereken şey duruyor: test korosu/şefinin adı,
işletmeciye ait davet alıcısı ve test sonunda silinecek kayıtlar.

## Test verisi seçimi — 7 Eylül 2026

Brief'in şart koştuğu "kullanıcı test verisini açıkça seçer" maddesi karşılandı. Ürün sahibinin
belirlediği kimlikler ve canlı durumları:

| Rol | Adres | Auth durumu (7 Eylül, salt okunur kontrol) |
|---|---|---|
| Platform operatörü | `alidiyarduran35@gmail.com` | **Var**, doğrulanmış. Allow-list'e eklendi; kanıt [007](007-operator-kontrollu-koro-olusturma.md#i̇lk-platform-operatörü-atandı--7-eylül-2026) |
| Test Şefi | `alidiyarduran35@gmail.com` — 7 Eylül'de operatörle aynı hesap olarak değiştirildi | **Var**, doğrulanmış. Önceki seçim `diyarinhesaplari@gmail.com` idi ve Auth'ta olmadığı için önkoşul yaratıyordu |
| Davet alıcısı | `ali.duran@orbibarobotics.com` | **Auth'ta yok** |

**Alıcının bulunmaması sorun değil, tam tersi.** 008 yeni Auth kullanıcısı yolunu açıkça
kapsıyor; davetin gerçek değeri de orada. Alıcı hesabı önceden açılmamalı.

**Şef artık operatörle aynı hesap.** Bu, `create_operator_choir`'ın var olan kurucu şartını
karşıladığı için yeni hesap açma önkoşulunu kaldırır. Ancak kayda geçmesi gereken bir sonucu var:

`alidiyarduran35@gmail.com` **hâlihazırda gerçek koronun aktif üyesidir** — `Genesi Nova`,
üyelik `ff249bd2-…`, rol `Partisyon Şefi`. Test korosunun kurucu Şefi yapılması bu hesaba
**ikinci bir üyelik** ekler. İki etkisi olur:

1. **Gerçek kullanım değişir.** 005 sözleşmesi gereği çok üyelikli hesapta koro seçimi zorunlu
   hâle gelir. Bu hesapla girişte artık doğrudan koroya değil, seçim ekranına düşülür. Test
   korosu silindiğinde eski davranışa döner.
2. **İstenen bir yan fayda.** [005](005-coklu-uyelik-aktif-koro.md) kaydı "gerçek ikinci üyelik ve
   seçiciyle canlı deneme yapılmadı" diyor. Bu kurulum tam olarak o boşluğu, gerçek bir hesapla ve
   üretim verisine dokunmadan doldurur.

Temizlikte dikkat: silinecek olan **yalnız test korosuna ait** üyelik ve rol satırlarıdır.
`Genesi Nova` üyeliği `ff249bd2-…` ve `Partisyon Şefi` rolü kesinlikle korunur. Bu hesap
operatör olduğu için Auth kullanıcısı da **silinmez**; temizlik listesinin 4. maddesi yalnız
davet alıcısı için geçerlidir.

### Temizlik listesi — önerilen, uygulanmadan önce ayrıca onaylanacak

Test bittiğinde silinecekler, dar kapsamlı:

1. Test korosuna ait `choir_member_roles`, `choir_members`, `roles` satırları
2. Test korosunun `choirs` satırı ve `genova_007.choir_creation_audit` kaydı
3. Test korosuna ait davet satırları (008 tablosu)
4. `ali.duran@orbibarobotics.com` Auth kullanıcısı. `alidiyarduran35@gmail.com` **silinmez** —
   gerçek koro üyesi ve platform operatörüdür
5. Operatör kaydı, artık gerekmiyorsa: `genova_007.platform_operators` tek satırı

Kapsam dışı ve **kesinlikle dokunulmayacak**: mevcut gerçek koro, 29 üyesi ve karar #17
kapsamındaki 27 hesap. Silme işlemi ayrı, hedefleri tek tek doğrulanmış bir işlemdir ve
o anda ayrıca onaylanır.

### Sıradaki adım değişmedi

Canlı 008 migration'ı hâlâ 3. adımın arkasında: taze restore üzerinde 008 uygulanıp
003–008 regresyonları, concurrency ve down roundtrip geçmeden canlı şemaya dokunulmaz.
Operatör ataması 007 altyapısıdır ve bu sıraya dahil değildir.

## Adım 3 sonucu — taze restore kabulü geçti (7 Eylül 2026)

Yedeğin geri yüklendiği yerel kopyada yalnız 008 migration'ı uygulandı; 003/005/006/007/008
izolasyon testleri, 008 concurrency kabulü ve gerçek down roundtrip çalıştırıldı. Canlı ortama
hiçbir şey uygulanmadı; canlı erişim yalnız rol özniteliklerini okumak için kullanıldı.

Ortam: yerel PostgreSQL 17.11 (Homebrew), veritabanı `genova_008_test_restore`, `127.0.0.1:5432`.
Koşucu: [supabase/test-support/010_step3_runner.sh](../../supabase/test-support/010_step3_runner.sh).
Koşucu, veritabanı adı `genova_008_test*` değilse, host `127.0.0.1` değilse veya 008 zaten
uygulanmışsa çalışmayı reddeder.

### İlk koşu başarısızdı ve sebebi yedeğin kendisiydi

| Test | Belirti |
|---|---|
| 003 | `Service-role cross-tenant announcement target accepted` — engellenmesi beklenen kiracılar-arası yazma kabul edildi |
| 006 | `Service role could not update choir_members` — başarılı olması beklenen güncelleme 0 satır etkiledi |
| 007 | `Founder must be an active Auth user with an email address` — fixture'daki kurucu görünmedi |

Üçünün de tek bir kök nedeni vardı: **`pg_dump` rol özniteliklerini taşımaz.** Öznitelikler
cluster globals'ta durur; şema, veri ve grant'lar gelir, `BYPASSRLS` gelmez. Canlıda
`postgres`, `service_role`, `supabase_admin` ve `supabase_read_only_user` bu yetkiyi taşıyor,
restore'da taşımıyordu. Sonuçları tam olarak yukarıdaki üç belirtidir:

- 007'deki `create_operator_choir` `security definer`'dır ve sahibi olan rol adına çalışır.
  O rol RLS'i atlayamayınca `auth.users` sorgusu boş döndü ve fonksiyon kurucuyu bulamadı.
- 006'da `service_role` RLS'e takıldı, güncelleme 0 satır etkiledi.
- 003'te kiracı CHECK'i bir üst kaydı sorgulayarak doğruluyor; o sorgu RLS yüzünden boş dönünce
  kısıt **sessizce geçti**. Yani koruma kalkmış olmasına rağmen hata değil, kabul üretti.

Bu üçüncüsü kaydın asıl değeri: geri yüklenmiş kopya "yüklendi" diye doğru sayılsaydı,
kiracı korumasının çalıştığı **yanlış** biçimde varsayılacaktı. Yedeğin var olması yetmiyor;
davranışsal olarak da eş olması gerekiyor.

Düzeltme: [restore-prep.sql](../../supabase/test-support/restore-prep.sql) artık öznitelikleri
canlı `pg_roles` çıktısından birebir kopyalar. Bu, yedek prosedürünün zorunlu bir parçasıdır.

### Koşucunun kendi hatası da düzeltildi

İlk sürüm down migration'ını ayrıca çalıştırıyordu; oysa `008_concurrency.mjs` roundtrip'i
zaten yapıyor — gerçek bir kabul commit'leyip down'ı uyguluyor ve kabul edilmiş üyeliğin
kaldığını doğruluyor. Bu yüzden ayrı down adımı zaten düşmüş nesneler üzerinde hata verdi,
ardından gelen iki kontrol de **yanlış sebeple** geçti. Koşucu artık roundtrip'i tekrarlamıyor,
concurrency testinin bıraktığı durumu doğruluyor.

### İkinci koşu — sonuç

| Adım | Sonuç |
|---|---|
| Önkoşul | 008 yok, `genova_003/005/007` var, `choir_members` = 29 |
| 008 migration uygulandı | PASS |
| 003 tenant isolation | PASS (`003 tenant isolation test passed`) |
| 005 active choir isolation | PASS |
| 006 membership admin lockdown | PASS |
| 007 operator controlled choir creation | PASS |
| 008 choir invitations | PASS |
| 008 concurrency + down roundtrip | PASS (`008 concurrent acceptance and accepted-membership preservation: passed`) |
| Down sonrası `genova_008` ve komut fonksiyonu kalktı | PASS |
| Üyelik sayısı roundtrip boyunca değişmedi | PASS, 29 |
| 008 down sonrası yeniden uygulandı | PASS |

Log: `supabase/test-support/010_step3.log`, 7 Eylül 14:37 UTC, **sıfır hata satırı**.
Log `.gitignore` kapsamındadır; kanıt olarak sonuç tablosu tutulur.

### Sınır

Bu, geri yüklenmiş bir kopyadaki kabuldür. Canlı DB'de 008'in davranacağının kanıtı değildir:
canlıda gerçek kullanıcılar, gerçek oturumlar ve gerçek e-posta teslimi vardır. 4. adım
(canlı migration) hâlâ ayrı bir işlem ve ayrı bir onaydır.

### Sırada

4. adım: canlı DB'ye yalnız kesin 008 SQL'i uygulanır, migration geçmişi işlenir, hosted testler
transaction + `ROLLBACK` ile koşturulur. Ardından 5. Edge deploy, 6. web yayını, 7. kontrollü
ürün kabulü. Test korosu operatör hesabıyla giriş yapılıp `create-choir` üzerinden açılacak.

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

```
cd ~/Antigravity/genovakorist
supabase --version
supabase link --project-ref hievmwwctjjlhmssoxsu

D=$(date +%F)
supabase db dump --linked --role-only -f backup_roles_$D.sql
supabase db dump --linked            -f backup_schema_$D.sql
supabase db dump --linked --data-only -f backup_data_$D.sql

shasum -a 256 backup_roles_$D.sql backup_schema_$D.sql backup_data_$D.sql
```

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

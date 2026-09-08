# 012 — çoklu üyelikte koro seçim kilidi

**Durum / tarih / sorumlu yazıcı:** Complete (10/10) — 8 September 2026 — single
writer: receiving Codex agent.

**Amaç (tek cümle) ve kullanıcı ihtiyacı:** Birden fazla koroya üye olan hesabın, oturum
başında koro seçim ekranını görebilmesi.

**Teslim odağı:** 005'in var oluş sebebi olan ekran canlıda çalışmıyordu. Tek satırlık bir
SQL kusuru, çok üyelikli her hesabı her yeni oturumda kilitliyordu. Bu brief onu kapatır;
başka bir davranış değiştirilmez.

## Başlangıç kanıtı — kusur önce üretildi, sonra düzeltildi

Ürün sahibi 7 Eylül'de oturum açtığında şunu gördü:

> Koro erişimi gerekli — Bu hesap için erişilebilir bir koro üyeliği bulunamadı.
> **Koro üyelik listesi beklenen sözleşmeyle eşleşmiyor.**

Hesabın iki üyeliği var: gerçek koro `genesi-nova` ve 010 turunda açılan `genova-008-test`.

**Zincir, uçtan uca okundu:**

1. `public.current_choir_id()` üç kademeli: oturum seçimi varsa onu, yoksa hesabın **tek**
   üyeliğini, o da yoksa **null** döner. Çok üyelikli ve seçim yapılmamış hesapta null
   dönmesi tasarım gereğidir.
2. `public.list_my_choirs()` `is_current` sütununu `choir.id = public.current_choir_id()`
   ile hesaplıyordu. SQL'in üç değerli mantığında `<değer> = null` sonucu `false` değil
   **null**'dır. Yani seçim yapılmamış çok üyelikli hesapta **her satır** `is_current = null`
   ile dönüyordu.
3. Paylaşılan istemci sözleşmesi (`lib/choir-context-core.ts`, `parseMembershipOption`)
   `is_current` için `boolean` şart koşuyor ve aksi durumda **kapalı tarafa düşüyor**:
   tek satır bile şemaya uymazsa `loadMyChoirs` "Koro üyelik listesi beklenen sözleşmeyle
   eşleşmiyor." diye fırlatıyor.
4. Liste fırlattığı için `choirs` boş kalıyor; `ChoirSelectionGate` ise boş listeyi
   "üyelik yok" sanıp seçim düğmelerini hiç çizmiyor (`components/ChoirSelectionGate.tsx:25`
   ve `:39`).

**Canlı üretim — düzeltmeden önce**, gerçek hesabın kimliğiyle, geri alınan bir transaction
içinde:

| `choir_slug` | `is_current` | null mı |
|---|---|---|
| `genesi-nova` | `null` | evet |
| `genova-008-test` | `null` | evet |

**Neden bugüne kadar görünmedi:** 010'a kadar sistemdeki her hesabın tam olarak bir üyeliği
vardı, dolayısıyla `current_choir_id()` ikinci kademeden o üyeliği döndürüyor ve
karşılaştırma `true` üretiyordu. Kusur, ikinci üyelik ortaya çıktığı anda görünür oldu. Bu,
005'in birim ve izole testlerinden de kaçmıştı: `supabase/tests/005_active_choir_isolation.sql`
"seçim yapılmamış çok üyelikli hesap bir kiracı çözmemeli" iddiasını doğruluyor, ama
`list_my_choirs()`'in o durumda **ne** döndürdüğünü hiç ölçmüyordu.

**İstemci neden değiştirilmedi:** `null`'ı `false` saymak kusuru gizlerdi. Sözleşmenin kapalı
tarafa düşmesi kasıtlı bir özelliktir ve bu kusuru zaten o ortaya çıkardı. Hata veritabanında,
düzeltme de oradadır: `boolean` ilan edilen bir sütun `null` döndürmemelidir.

**İzinli dosyalar / modüller:**

- `supabase/migrations/20260907210932_list_my_choirs_is_current_not_null_012.sql`
- `supabase/rollback/012_list_my_choirs_is_current_not_null_down.sql`
- `supabase/tests/012_list_my_choirs_is_current.sql`
- `supabase/test-support/012_regression_runner.sh`
- `supabase/test-support/010_step3_runner.sh`
- Bu brief
- `docs/agent-handoff.md`, `MIGRATION.md`, `memory-bank/activeContext.md`,
  `memory-bank/productContext.md`, `memory-bank/systemPatterns.md`,
  `memory-bank/techContext.md`, `memory-bank/progress.md`

## Transition start-check — 8 September 2026

- **Sources read:** `AGENTS.md`, `docs/agent-handoff.md`, `docs/gecis-rehberi.md`,
  `docs/ai-calisma-duzeni.md`, all six `memory-bank/` files, this brief,
  `KARARLAR.md`, `MIGRATION.md`, the 005/012 SQL tests, both 012 migration
  directions, `supabase/test-support/010_step3_runner.sh`, and CI configuration.
- **Single result and boundary:** execute the existing 012 SQL regression in an
  isolated PostgreSQL 17 database, prove it fails for the old function restored by
  the down-migration, then restore the fixed function. This is a backend test task;
  no native, WebView, client-contract, RLS or production behavior changes.
- **Behavior preserved:** `current_choir_id()` remains fail-closed before a
  multi-membership selection; `list_my_choirs()` must expose explicit booleans;
  single-membership and selected-session behavior remain unchanged.
- **Authority and ownership:** one local writer. Local implementation, local commits
  and repository gates are authorized. Push, deploy, production migration/data,
  `Genesi Nova`, email, spending and hardware are not authorized and were not used.
- **Environment, tests and rollback:** local PostgreSQL 17.11 at `127.0.0.1`, database
  `genova_008_test_restore`, with 003 and 005 present. The runner refuses non-local or
  non-test-named targets, snapshots fixture tables, applies fix → test → down →
  expected failure → fix → test, and restores the fix from an exit trap. At task
  start local `main` was `03ea87d`, one commit ahead of the local `origin/main` ref;
  the only worktree change was the pre-existing `supabase/.temp/cli-latest` cache.

**Kapsam dışı:** istemci sözleşmesi, `current_choir_id()`'nin kademeleri, `set_active_choir`,
RLS politikaları, şema ve veri. Hiçbiri değiştirilmedi.

**Risk / yetki / geri dönüş:** Değişiklik yalnız bir fonksiyon gövdesidir; şema, veri, yetki
ve politika dokunulmadı. `create or replace` mevcut yetkileri korur, yine de `revoke`/`grant`
satırları tekrar uygulandı. Geri dönüş tek dosya: `supabase/rollback/012_…_down.sql`, eski
gövdeyi geri koyar. Web istemcisinin yeniden yayınlanması **gerekmez** — düzeltme tamamen
veritabanındadır ve yayındaki `6b6d9a4` ile çalışır.

## Düzeltme

`choir.id = public.current_choir_id()` yerine
`choir.id is not distinct from public.current_choir_id()`.

Anlam birebir korunur: satır oturumun aktif korosuysa `true`, değilse `false` — "henüz seçim
yapılmadı" hâli dahil. `choir.id` birincil anahtardır ve asla null olamaz, dolayısıyla
operatörün "iki taraf da null" dalına düşülemez.

## Aynı sınıftan başka kusur var mı — tarama

Kusurun sınıfı şu: istemcinin katı ayrıştırıcısına `null` gelebilen bir alan beslemek.
`parseMembershipOption`'ın şart koştuğu altı alan canlıda tek tek kontrol edildi.

| Alan | Kaynak | Null olabilir mi |
|---|---|---|
| `choir_id` | `public.choirs.id` | hayır (NOT NULL, birincil anahtar) |
| `member_id` | `public.choir_members.id` | hayır (NOT NULL) |
| `choir_name` | `public.choirs.name` | hayır (NOT NULL) |
| `choir_slug` | `public.choirs.slug` | hayır (NOT NULL) — sözleşme zaten null'a da izin veriyor |
| `member_is_active` | `public.choir_members.is_active` | hayır (NOT NULL, varsayılan `true`) |
| `is_current` | **hesaplanan** | **evet — düzeltilen kusur buydu** |

Yani listeyi besleyen tek hesaplanan alan `is_current`'tı ve tek null kaynağı oydu.
`boolean` dönen diğer fonksiyonlar (`is_chef`, `is_leader`, `current_member_has_role` ve
benzerleri) RLS `using` ifadelerinde kullanılıyor; orada `null` "izin yok" gibi davranır,
yani kapalı tarafa düşer, açılmaz. Bu tarama yeni bir kusur bulmadı.

## Sonuç kaydı

| Tarih | Komut / işlem | Ortam | Sonuç | Kanıt / sınır |
|---|---|---|---|---|
| 7 Eylül 2026 | Kusurun üretilmesi: gerçek hesabın kimliğiyle `list_my_choirs()` | **canlı**, geri alınan transaction | kusur **doğrulandı** | İki satır da `is_current = null` |
| 7 Eylül 2026 | Fonksiyon gövdesinin değiştirilmesi | **canlı** | uygulandı | Yalnız `create or replace` + `revoke`/`grant` + `comment` |
| 7 Eylül 2026 | Yayındaki gövdenin depo dosyasıyla karşılaştırılması | canlı → yerel | **birebir aynı** | `pg_get_functiondef` gövdesi, boşluk normalize edilerek dosyayla karşılaştırıldı; MCP üzerinden elle yazmanın kopyalama hatası riski böylece kapatıldı |
| 7 Eylül 2026 | Defter satırı | canlı | eklendi | `version='20260907210932'`, dosya adıyla hizalı; damga MCP'ye ürettirilmedi |
| 7 Eylül 2026 | Düzeltme sonrası: çok üyelikli hesap, seçim yok | **canlı**, geri alınan transaction | **geçti** | İki satır, `is_current = false, false`; null yok |
| 7 Eylül 2026 | Düzeltme sonrası: tek üyelikli gerçek hesap | **canlı**, geri alınan transaction | **geçti** | 1 satır, `is_current = true` — mevcut davranış korundu |
| 7 Eylül 2026 | Düzeltme sonrası: `set_active_choir` ardından liste | **canlı**, geri alınan transaction | **geçti** | Seçilen koro `true`, diğeri `false` |
| 7 Eylül 2026 | `supabase/tests/012_list_my_choirs_is_current.sql` | — | **çalıştırılmadı** | Regresyon testi yazıldı ama koşulmadı: dosyadan `psql -f` ile çalıştırmak gerekiyor ve ajanın iki kabuğundan da canlı Postgres'e erişim yok. Testin iddiaları canlıda tek tek elle doğrulandı; bu, dosyanın koşulduğu anlamına gelmez |
| 8 Sep 2026, `5702bca` | `PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=genova_008_test_restore PSQL_BIN=/opt/homebrew/opt/libpq/bin/psql bash supabase/test-support/012_regression_runner.sh` | local isolated PostgreSQL 17.11 restored copy; 003 and 005 present | **PASS** | Fixed function: SQL file exited 0. Down-migration: the same file exited 3 with the expected `is_current came back null for 2 row(s)` assertion. The runner restored the fix and the file exited 0 again. Full-row hashes and counts for `auth.users`, `public.choirs`, `public.choir_members` and `genova_005.active_choir_sessions` matched before/after both fixture runs. Not production and not a live-product check. |
| 8 Sep 2026, `5702bca` | `bash -n` for both runners; run 012 runner with `PGDATABASE=postgres` | local shell | **PASS** | Both scripts parse. The target guard refused the non-test database before connecting and exited 2. The full 010 restore runner was not rerun because this copy already has 008 applied; its new 012 step is syntax-checked, while the standalone 012 runner is the executed evidence. |

Üç canlı doğrulama da fikstür bırakmadı: hepsi `rollback` ile biten transaction'lar içindeydi
ve `set_active_choir` çağrısı da aynı transaction'da geri alındı.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| The defect is reproduced before it is fixed | yes | **PASS** | 7 Sep 2026, live, rolled-back transaction as the affected account | Both rows returned `is_current = null` |
| A member with several memberships and no selection gets a boolean `false` on every row | yes | **PASS** | 7 Sep 2026, live, same method after the change | Two rows, `false`/`false`, no nulls |
| A member with a single membership is unaffected | yes | **PASS** | 7 Sep 2026, live, a real single-membership account | One row, `is_current = true` |
| After `set_active_choir`, exactly one row is current | yes | **PASS** | 7 Sep 2026, live | Selected choir `true`, the other `false` |
| The deployed function body matches the repository migration | yes | **PASS** | 7 Sep 2026, `pg_get_functiondef` compared with the file | Whitespace-normalised bodies identical |
| The migration ledger stays aligned with the repository | yes | **PASS** | 7 Sep 2026 | `20260907210932` written by hand to match the filename |
| No schema, data, grant or policy changed | yes | **PASS** | 7 Sep 2026 | Function body only; `revoke`/`grant` re-asserted unchanged |
| A rollback exists | yes | **PASS** | 7 Sep 2026 | `supabase/rollback/012_list_my_choirs_is_current_not_null_down.sql` restores the old body |
| Regression test file runs green and guards the down-migration | yes | **PASS** | 8 Sep 2026, `5702bca`, local isolated PostgreSQL 17.11, `PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=genova_008_test_restore PSQL_BIN=/opt/homebrew/opt/libpq/bin/psql bash supabase/test-support/012_regression_runner.sh` | Exit 0 with the fixed function; exit 3 with the expected two-null-row assertion after the down-migration; exit 0 after restoring the fixed function. Full fixture-table snapshots matched before/after. The reusable runner is also called by `010_step3_runner.sh`; that complete restore suite was not rerun in this task. |
| The affected member can reach the choir picker in the live product | yes | **PASS** | 8 Sep 2026 00:16 (+03), live product, owner's own session | `genova_005.active_choir_sessions` gained a row for session `c45ce20e-…` selecting `genesi-nova`. A selection can only be written after `loadMyChoirs` succeeds — the exact call that used to throw — so the client parsed the list and the server-verified switch went through. The owner reports the app now opens instead of stopping at the gate. Limit: the picker screen itself was not observed by the agent; the evidence is the selection it produces |

Required criteria: 10. Passed: 10. Failed: 0. Not run: 0. Self-review; no independent review.

**Delivery:** the live defect and product confirmation remain the historical evidence above.
The formerly unrun SQL file is now executed and mutation-tested locally: green on the fixed
function, red for the expected reason on the down-migration, and green after restoring the fix.
Both fixture transactions left the isolated copy unchanged. Commit `5702bca` gives the guard
a reusable runner and includes it in the existing restored-database acceptance path. No push,
deployment, live database operation, real choir access, email or hardware test was performed.

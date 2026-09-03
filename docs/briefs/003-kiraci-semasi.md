# 003 — Kiracı şeması (`choir_id`)

**Amaç (tek cümle):** Veritabanını tek korodan çok koroya taşımak — her tabloya kiracı
kimliği eklemek ve tüm RLS politikalarını kiracıya göre yeniden yazmak.

**Tamamen backend.** Mobil istemci, ekran, derleme yok. Web uygulaması da hemen faydalanır.

**Neden şimdi:** Bu, projedeki tek "şimdi ucuz, sonra pahalı" karar. Canlı veri ve
yayınlanmış bir mobil uygulama varken 133 politikayı yeniden yazmak acı verici bir göç olur;
mobil istemci yazılmadan yapmak neredeyse bedava. (`KARARLAR.md` #9)

---

## ⚠ ÖNCE OKU — bu veritabanı paylaşımlı

`AGENTS.md`: *"genesinovachoir web sitesiyle aynı Supabase DB — schema değişikliklerinde
her iki projeyi göz önünde bulundur."*

Bu göç **iki projeyi birden etkiler.** Web sitesi tarafındaki sorguları da kırabilir.
Başlamadan önce hangi tabloların site tarafından kullanıldığı çıkarılmalı.

---

## Mevcut durum (repodan ölçüldü)

- **~22 tabloda RLS var, toplam 133 politika**
- En yoğunları: `repertoire_pdf_annotations` (66), `repertoire` (31), `song_assignments` (30),
  `repertoire_song_comments` (19), `assignment_submissions` (18), `assignment_targets` (17)
- Diğerleri: `rehearsals`, `rehearsal_invitees`, `profile_change_requests`, `announcements`,
  `push_subscriptions`, `assignment_submission_*`, `repertoire_tags`, `repertoire_song_tags`,
  `repertoire_files`, `repertoire_cache_versions`, `assignments`, `choir_members`, `chat_*`
- **Hiçbirinde kiracı kolonu yok.**

**Kilit nokta:** Politikaların neredeyse tamamı `public.current_choir_member_id()` üzerinden
kuruluyor. Yani tek bir boğaz var — kiracı kapsamı büyük ölçüde onun yanına eklenecek
`public.current_choir_id()` ile kurulabilir. Politika deseni tekdüze olduğu için iş
133 ayrı problem değil, **bir desen × 133 tekrar.**

**Şemayı repodan varsayma.** `choir_members`, `repertoire`, `assignments`, `chat_*` gibi
çekirdek tablolar bu migration'larda yaratılmamış. Canlı şemayı `supabase-genesinova`
MCP'siyle çıkar ve tam tablo listesini oradan al.

---

## Bitti tanımı

- [ ] `choirs` tablosu var, mevcut koro tek satır olarak içinde
- [ ] Kiracı kapsamındaki **her** tabloda `choir_id uuid not null` + FK + indeks
- [ ] Mevcut tüm satırlar o tek koroya bağlanmış (hiç `null` kalmamış)
- [ ] `public.current_choir_id()` fonksiyonu var
- [ ] **133 politikanın tamamı** kiracıya göre yeniden yazılmış
- [ ] `choir_id` insert'lerde varsayılan olarak doluyor (istemci göndermek zorunda değil)
- [ ] **İzolasyon testi geçti** (aşağıya bak) — bu madde olmadan görev kapanmaz
- [ ] Web uygulaması çalışıyor: `pnpm check` yeşil, temel akışlar elle denendi
- [ ] `MIGRATION.md` güncellendi

---

## Sıra — canlı veri üstünde güvenli göç

Tek migration dosyası, adımlar bu sırayla. Sıra önemli: kolonu önce `null` kabul eden
şekilde eklemezsen mevcut satırlar yüzünden migration patlar.

1. `choirs` tablosu (`id`, `slug`, `name`, `created_at`), mevcut koro `insert` edilir
2. Her tabloya `choir_id uuid` — **önce nullable**
3. Backfill: tüm satırlara o koronun id'si
4. `not null` + `references public.choirs(id)` + `create index`
5. `public.current_choir_id()` — `choir_members`'tan `auth.uid()` ile bulunur,
   `current_choir_member_id()` ile aynı kalıpta (`stable`, `security definer`, `search_path = public`)
6. `choir_id` için `default public.current_choir_id()` — istemci göndermek zorunda kalmasın
7. **Politikalar**: her `using`/`with check` ifadesine `choir_id = public.current_choir_id()`
   koşulu eklenir. Mevcut idiom korunur, üstüne kiracı kapsamı biner:

```sql
-- ÖNCE
create policy read_choir_members on public.choir_members
for select to authenticated
using (is_active = true or auth_user_id = auth.uid());

-- SONRA
create policy read_choir_members on public.choir_members
for select to authenticated
using (
  choir_id = public.current_choir_id()
  and (is_active = true or auth_user_id = auth.uid())
);
```

8. `notify pgrst, 'reload schema';`

---

## İzolasyon testi — bu olmadan RLS'in çalıştığını bilmiyorsun

Politikaları yazmak yetmez, **sızmadığını kanıtlamak** gerekir.

1. Test amaçlı ikinci bir koro (`choir_b`) ve ona bağlı bir üye oluştur
2. `choir_b` için birkaç satır ekle: bir repertuvar parçası, bir duyuru, bir anotasyon
3. `choir_b` üyesinin oturumuyla **her tabloyu** sorgula → sadece kendi satırlarını görmeli
4. Asıl koronun üyesiyle aynı sorgular → `choir_b` satırlarının **hiçbirini** görmemeli
5. `choir_b` üyesiyle asıl koronun bir satırına `update`/`delete` dene → reddedilmeli
6. Test verisini temizle

Bunu tek bir SQL betiği olarak yaz ve `supabase/tests/` altına koy — Faz 2'de
katman limitleri eklenirken tekrar çalıştırılacak.

---

## Kapsam dışı

Bunlar Faz 2'nin işi, bu görevde **yapılmayacak**:

- Koro kaydı / yeni koro açma akışı
- Plan tablosu, katman limitleri (4 kişi / 30 kişi / pro)
- Üye davet akışı
- Faturalama (v1'de zaten yok — `KARARLAR.md` #10)
- Mobil istemci tarafında hiçbir şey
- Google Drive dosyalarının kiracıya göre ayrılması (ayrı ve daha büyük iş)

---

## Riskler

| Risk | Karşılık |
|---|---|
| Paylaşımlı DB — web sitesi kırılabilir | Başlamadan site tarafının kullandığı tabloları çıkar; göçten sonra iki projeyi de dene |
| 133 politika, elle yazım hatası | Desen tekdüze; betikle üret, gözle doğrula. İzolasyon testi asıl güvence. |
| Geri dönüş gerekirse | Tek migration dosyası + `down` betiği hazır tutulsun |
| `default current_choir_id()` service-role yazımlarında yanlış kiracıya yazabilir | Edge Function'larda `choir_id` **açıkça** verilsin, varsayılana güvenilmesin |

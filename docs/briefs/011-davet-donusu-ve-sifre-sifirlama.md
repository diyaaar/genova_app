# 011 — davet dönüşü ve kendi kendine şifre sıfırlama

**Durum / tarih / sorumlu yazıcı:** Kısmî (8/12 zorunlu ölçüt geçti) — 7 Eylül 2026 — tek yazıcı: bu ajan.

**Amaç (tek cümle) ve kullanıcı ihtiyacı:** Davet edilen koristin e-posta doğrulamasından
sonra davetine geri dönebilmesi ve şifresini kendi sıfırlayabilmesi.

**Teslim odağı:** 008 davet akışının iki kopuk noktası kapanır. İkisi de 010'un kontrollü
canlı kabulünde gerçek kullanıcı davranışıyla ortaya çıktı; ikisi de yeni özellik değil,
var olan akışın tamamlanmamış dönüş yolları. Ertelenen: davet e-postasının kendi
şablonu, çoklu cihaz devri, davet bağlantısının tekrar gönderilmesi.

## Başlangıç kanıtı

**Doğrulanmış durum — okunan koddan:**

1. `app/invite/page.tsx:30` `supabase.auth.signUp({ email, password })` çağrısını
   `emailRedirectTo` **olmadan** yapıyor. Doğrulama bağlantısı bu yüzden Supabase'in
   Site URL'ine döner. Kullanıcı `/` adresine düşer, üyeliği olmadığı için
   `app/(main)/layout.tsx:110` onu `ChoirSelectionGate`'te durdurur ve davet bağlantısı
   elden gitmiş olur. Sayfa bugün bunu yalnız bir metinle telafi ediyor
   (`app/invite/page.tsx:32`: "bu davet bağlantısını yeniden açıp giriş yapın").
2. Depoda hiçbir yerde `resetPasswordForEmail` çağrısı yok — tek eşleşme
   `supabase/functions/account-recovery-006/index.ts:134`, o da yönetici tarafından
   çalıştırılan olay kurtarma fonksiyonu, kullanıcıya açık bir akış değil.
   `app/invite/page.tsx:68`'deki "Şifremi unuttum" bağlantısı `/auth/recovery`'ye
   gidiyor; o sayfa yalnız **var olan** bir kurtarma oturumunu tüketiyor
   (`app/auth/recovery/page.tsx:25` `?recovery=1` işareti + oturum arar) ve oturumsuz
   gelen herkese "Bu kurtarma bağlantısı geçersiz veya süresi dolmuş" der. Bağlantı
   bugün çıkmaz sokak.

**Canlı gözlem (010, 7 Eylül 2026):** ürün sahibi 1. maddeyi gerçek bir kayıtla yaşadı;
doğrulamadan sonra "Koro erişimi gerekli" ekranında kaldı ve daveti elle yeniden açmak
zorunda kaldı. 2. maddede yönetici tarafından üretilen kurtarma bağlantısı, uygulamanın
kurtarma sayfasına değil kök adrese döndüğü için parola sormadan oturum açtı.

**Düzeltilen erken varsayım:** `/auth/recovery` sayfasının kendisi kusurlu sanılmıştı.
Kod okundu: sayfa yeni parolayı zorunlu tutuyor, `updateUser` sonrası
`signOut({ scope: 'global' })` çağırıyor (`app/auth/recovery/page.tsx:61-71`). Kusur
sayfada değil, o sayfaya giden yolun hiç var olmamasında.

**Neden token'ı yönlendirme adresine koymuyoruz:** `lib/supabase.ts:6` `createClient`'ı
varsayılan ayarlarla kuruyor, yani implicit akış; Supabase doğrulama dönüşünde adresin
**fragment**'ine `#access_token=…` ekler. `emailRedirectTo` içine konan `#invite=…`
bu ek tarafından ezilir. Sorgu dizesine (`?invite=…`) taşımak ise ham token'ı Referer
başlığına ve sunucu erişim kayıtlarına düşürür; 008'in "ham token hiçbir yerde
saklanmaz" kuralına ters düşer. Bu yüzden token adres satırıyla değil, tarayıcının
kendi oturum deposuyla taşınır.

**İzinli dosyalar / modüller:**

- `lib/invite-token-store.ts` — yeni, DOM'suz saklama sözleşmesi (depo enjekte edilir)
- `app/invite/page.tsx` — token'ı kaydet/geri oku; `signUp`'a `emailRedirectTo`
- `app/auth/recovery/page.tsx` — oturumsuz gelen kullanıcıya sıfırlama isteği formu
- `lib/auth-recovery.ts` — istek formunun doğrulaması ve sabit yanıt metni
- `__tests__/` — saf mantık testleri

**Kaynaklar / mevcut desen:**

- `lib/choir-context-core.ts` — DOM'suz çekirdek + ince web bağlaması deseni; bu iş
  aynı deseni izler
- `lib/choir-invitations.ts:22-26` — `invitationTokenFromHash`, 64 hex doğrulaması
- `docs/briefs/008-davet-ve-uyelik.md` — ham token kuralı
- `docs/briefs/010-008-canli-yayin-ve-kabul.md#adım-7--kontrollü-ürün-kabulü-ilk-tur-7-eylül-2026` — bulguların canlı kanıtı

**Geçiş başlangıç kontrolü**

- Okunan talimatlar, kararlar ve mevcut kanıtın yolları: `AGENTS.md`,
  `docs/gecis-rehberi.md`, `docs/agent-handoff.md`, 008 ve 010 brief'leri, yukarıda
  satır numarasıyla verilen kaynak dosyalar.
- Tek doğrulanabilir sonuç; sınır: davet edilen kullanıcı doğrulamadan sonra davetine
  dönebilir ve şifresini kendi sıfırlayabilir. Değişiklik **yalnız web istemcisidir**;
  native/WebView sınırı, Edge fonksiyonu, RPC ve şema değişmez.
- Korunacak mevcut davranış: `invitationTokenFromHash` sözleşmesi (yalnız `#invite=`,
  64 hex) aynen kalır; `/auth/recovery`'nin kurtarma oturumu yolu aynen kalır; üyeliksiz
  hesabı durduran `ChoirSelectionGate` davranışı **kasten** değişmez.
- İzinli dosyalar, tek yazıcı ve verilmiş yetki: yukarıdaki liste; yerel uygulama ve
  yerel commit yetkisi var. Push, dağıtım, canlı işlem yetkisi **yok**.
- Gerekli testler, ortamları, geri dönüş ve çözülmemiş çelişkiler: saf mantık için jest;
  kök kapı `pnpm check`. Ajan ortam sınırı aşağıda kayıtlı. Geri dönüş: tek commit'in
  `git revert`'i; DB veya dağıtım eseri üretilmiyor.

**Kapsam dışı** — bu görevde kesinlikle yapılmayacaklar:

- Canlı işlem: migration, Edge dağıtımı, push, deployment, gerçek e-posta gönderimi
- 010'un kalan adımları (temizlik, kalan olumsuz yollar, canlı domain doğrulaması)
- `ChoirSelectionGate` veya `app/(main)` yetki kapısının davranışını değiştirmek
- Davet e-postası şablonu, SMTP ayarı, 009 yönlendirme yapılandırması
- Bağımsız kayıt ekranı eklemek — kayıt tasarım gereği yalnız davetle olur

**Risk / yetki / geri dönüş:**

- Kullanıcı/veri etkisi: yok. Şema, RPC, Edge ve canlı veri değişmiyor. Yeni saklanan
  tek şey, kullanıcının kendi tarayıcısındaki kısa ömürlü davet token'ı.
- Güvenlik riski ve karşılığı: token tarayıcı deposunda durur; bu yüzden yalnız
  `sessionStorage`, davetin kendi süresinden kısa bir son kullanma damgasıyla ve kabul
  başarılı olur olmaz silinerek. Adres satırına, sorgu dizesine ve sunucuya gitmez.
- Sıfırlama isteği kötüye kullanımı: form, hesabın var olup olmadığını **açık etmez**;
  her durumda aynı metni gösterir. Hız sınırı Supabase Auth tarafındadır ve bu brief'te
  değiştirilmez.
- Geri dönüş: tek commit; `git revert` yeter. Yayınlanmadığı için canlı geri dönüş yok.

**Küçük uygulama adımları:**

1. Kanıt: yukarıdaki iki bulgu koddan satır numarasıyla doğrulandı.
2. `lib/invite-token-store.ts`: saf `readInviteToken` / `rememberInviteToken` /
   `forgetInviteToken`, depo ve saat enjekte edilir, 64 hex doğrulaması ve son kullanma.
3. `app/invite/page.tsx`: hash'te token varsa hatırla; hash boşsa depodan oku;
   `signUp`'a `emailRedirectTo` ver; kabul başarılıysa unut.
4. `app/auth/recovery/page.tsx`: `invalid` durumunda sıfırlama isteği formu;
   `lib/auth-recovery.ts` içine e-posta doğrulaması ve sabit yanıt metni.
5. Testler ve kök kapısı; diff incelemesi; sonuç kaydı.

**Bitti tanımı** — hepsi kanıtlanmadan görev kapanmaz:

- [x] Doğrulamadan dönen kullanıcı `/invite`'ta kabul düğmesini görüyor (token depodan) — birim düzeyi.
- [x] Depo boşsa veya token bozuksa sayfa eski davranışına düşüyor, çökmüyor.
- [x] Süresi geçmiş depo kaydı token vermiyor.
- [x] Kabul başarılı olduğunda depo temizleniyor — inceleme düzeyi.
- [x] Sıfırlama isteği hesabın varlığını açık etmiyor — birim + inceleme; gerçek gönderim koşulmadı.
- [ ] Kurtarma oturumuyla gelen kullanıcının mevcut yolu bozulmadı.
- [ ] Geçiş işi başlangıç kontrolü ve rehberin teslim kontrolleri kanıtlandı.
- [ ] Proje kapısı: `pnpm check` (depo kökü).
- [ ] Diff incelendi; kapsam dışı değişiklik yok; kanıt bağlantıları güncel.

**Sonuç kaydı:**

| Tarih | Komut / işlem | Ortam | Sonuç | Kanıt / sınır |
|---|---|---|---|---|
| 7 Eylül 2026 | Bulguların koddan doğrulanması | yerel okuma | geçti | Satır numaraları yukarıda |
| 7 Eylül 2026 | `vitest run --environment node` — `lib/invite-token-store.test.ts`, `lib/auth-recovery.test.ts` | yalıtılmış konteyner | **19/19 geçti** | Sınır: depo kendi vitest 4.1.11'iyle değil, ayrı bir konteynerde vitest 5.0.0 ile koşuldu; depo kapısı değildir |
| 7 Eylül 2026 | `pnpm check` (kök kapı) | — | **çalıştırılmadı** | Ajan ortam sınırı, aşağıda |
| 7 Eylül 2026 | Diff incelemesi | yerel | yapıldı — **öz-inceleme**, bağımsız inceleme değil | Kapsam dışı değişiklik yok; `supabase/.temp/cli-latest` bilerek commit'e alınmadı |

### Ajan neden kök kapısını koşamadı

Depo kökündeki `node_modules` macOS için kurulu; ajanın eriştiği kabuk ayrı bir Linux
VM'inde çalışıyor. Orada `pnpm check` koşmak ya native ikililer yüzünden başarısız olur ya
da yeniden kurulum ürün sahibinin macOS kurulumunu geçersiz kılar. Bu, oturum boyunca
zaten bilinen ve kayıtlı bir sınır. Bulut konteynerinde depo kopyası yok ve uzak git oradan
erişilebilir değil. Bu yüzden saf mantık, dosyaları taşıyıp yalıtılmış bir konteynerde
koşuldu; TSX değişiklikleri yalnız incelendi, derlenmedi.

### Uygulanmadan önce gereken canlı yapılandırma — kod değil, panel ayarı

`emailRedirectTo` ve `redirectTo` adresleri Supabase Auth'un **izinli yönlendirme adresleri**
listesinde yoksa Supabase onları yok sayar ve yine Site URL'e döner; yani düzeltme sessizce
etkisiz kalır. `supabase/config.toml` bu listeyi taşımıyor (dosya yalnız fonksiyon
`verify_jwt` ayarlarını içeriyor), dolayısıyla ayar panelden yapılır. Gereken iki adres:

- `https://app.genesinovachoir.com/invite`
- `https://app.genesinovachoir.com/auth/recovery`

Bu adım ürün sahibine aittir; bu brief canlı yapılandırma yetkisi vermiyor ve aşağıdaki
tabloda ayrı bir satır olarak **NOT RUN** duruyor.

**Teslim:** commit `<aşağıda>`. Kalan risk: kök kapısı ve tarayıcı davranışı ajan tarafından
koşulmadı; canlı yönlendirme listesi henüz ayarlanmadı. Sıradaki tek adım: ürün sahibi
`pnpm check` koşar ve iki yönlendirme adresini izin listesine ekler; ardından davet akışı
010'un kalan turunda uçtan uca yeniden denenir.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Token stored on first `#invite=` load and returned when the hash no longer carries it | yes | **PASS** | 7 Sep 2026, isolated container, `vitest run --environment node` | `rememberInviteToken` / `readInviteToken` round trip; unit level only |
| Missing, malformed or non-hex stored entry yields no token and is cleared | yes | **PASS** | same run | Five malformed shapes plus a non-numeric expiry, all cleared |
| Expired entry yields no token | yes | **PASS** | same run | Boundary checked at `TTL - 1` and `TTL` |
| Storage that is absent or throws degrades quietly instead of breaking the page | yes | **PASS** | same run | Null storage and a throwing storage for every operation |
| Raw token never placed in a URL query string | yes | **PASS** | 7 Sep 2026, diff review | No query parameter is written anywhere; the token moves between the fragment and storage only. Limit: self-review, not an executed network check |
| `forgetInviteToken` is called on a successful acceptance | yes | **PASS** | 7 Sep 2026, diff review of `app/invite/page.tsx` | Call sits between the successful command and the reload. Limit: reviewed, not executed |
| `signUp` returns the reader to `/invite` rather than the site root | yes | **NOT RUN** | — | Code changed and reviewed; proving it needs a real verification round trip, which belongs to 010 and to the owner |
| Reset request accepts a valid address and rejects an undeliverable one before any network call | yes | **PASS** | 7 Sep 2026, isolated container, `vitest run` | `validateRecoveryEmail`: trimming, empty, five invalid shapes, over-long address |
| Reset request reveals nothing about account existence | yes | **PASS** | 7 Sep 2026, unit + diff review | One notice constant for every outcome; only a 429 differs, which is about rate, not existence |
| Existing recovery-session path still reaches the new-password form | yes | **NOT RUN** | — | No component test was executed. The `PASSWORD_RECOVERY` and `?recovery=1` branches are untouched and the late-resolution guard only refuses to overwrite a state the reader has moved past |
| Supabase Auth redirect allow-list contains `/invite` and `/auth/recovery` | yes | **NOT RUN** | — | Dashboard setting, not in `supabase/config.toml`. Without it the redirect silently falls back to the site root and the fix has no effect. Owner action |
| Repository gate `pnpm check` | yes | **NOT RUN** | — | Agent cannot run it; see the environment limit above. Owner action |
| Real email round trip through the live project | N/A — this brief grants no live or email authority | N/A | — | Live acceptance belongs to 010 |

Required criteria: 12. Passed: 8. Not run: 4. This is a count of required criteria that
actually passed, not a quality score; the task stays **partial** until the four run.

Review the diff against the brief after testing and record whether the review was
self-review or an independent review.

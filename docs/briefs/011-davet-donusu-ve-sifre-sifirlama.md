# 011 — davet dönüşü ve kendi kendine şifre sıfırlama

**Durum / tarih / sorumlu yazıcı:** Kısmî (11/13 zorunlu ölçüt geçti) — 7 Eylül 2026 — tek yazıcı: bu ajan.

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
- [x] Proje kapısı: `pnpm check`'in ilk dört adımı (lint, typecheck, 206 test, service worker).
- [x] Proje kapısı: `pnpm build` — ürün sahibinin macOS'unda geçti.
- [ ] Diff incelendi; kapsam dışı değişiklik yok; kanıt bağlantıları güncel.

**Sonuç kaydı:**

| Tarih | Komut / işlem | Ortam | Sonuç | Kanıt / sınır |
|---|---|---|---|---|
| 7 Eylül 2026 | Bulguların koddan doğrulanması | yerel okuma | geçti | Satır numaraları yukarıda |
| 7 Eylül 2026 | `vitest run --environment node` — `lib/invite-token-store.test.ts`, `lib/auth-recovery.test.ts` | yalıtılmış konteyner | **19/19 geçti** | Sınır: depo kendi vitest 4.1.11'iyle değil, ayrı bir konteynerde vitest 5.0.0 ile koşuldu; depo kapısı değildir |
| 7 Eylül 2026 | `pnpm lint` | temiz Linux kurulumu (`pnpm install --frozen-lockfile`, pnpm 11.9.0, Node 22.23.2) | **geçti** | `eslint . --max-warnings=0`, çıkış 0 |
| 7 Eylül 2026 | `pnpm typecheck` | aynı | **geçti** | `tsc --noEmit`, çıkış 0 — 011'in TSX değişikliklerini de kapsar |
| 7 Eylül 2026 | `pnpm test:coverage` | aynı | **geçti** | **33 dosya / 206 test**, kapsam eşikleri dahil çıkış 0 |
| 7 Eylül 2026 | `pnpm test:service-worker` | aynı | **geçti** | `node --check public/sw.js`, çıkış 0 |
| 7 Eylül 2026 | `pnpm build` | aynı | **değerlendirilemedi** | Ağ engeli, kod sonucu değil: `next/font` Google Fonts'a çıkamıyor — `Failed to fetch font 'Noto Serif' … 'Manrope'`. Her iki ajan ortamında da `fonts.googleapis.com` ve `fonts.gstatic.com` proxy tarafından 403 ile kesiliyor |
| 7 Eylül 2026 | `pnpm build`, kopyada yazı tipleri saplama ile | aynı kopya, depoya dokunulmadı | **derlendi ve prerender etti** | **Kapı değildir.** Yalnız yazı tipi çağrıları saplandı; `✓ Compiled successfully`, `✓ Generating static pages (17/17)`, listede `○ /invite` ve `○ /auth/recovery`. Yani font indirmesi dışında derlemeyi bozan bir şey yok — CI'da `/auth/recovery` prerender'ında patlayan türden bir hata bu koşuda çıkmadı |
| 7 Eylül 2026 | `pnpm build` (gerçek kapı) | ürün sahibinin macOS'u | **geçti** | Ürün sahibinin yapıştırdığı çıktı tam rota tablosuyla bitiyor (`/profil/degisiklikler` … `/repertuvar/[id]`, `First Load JS shared by all 103 kB`) ve kabuk hatasız komut istemine dönüyor. Bu tablo yalnız başarılı derlemede basılır. Sınır: çıkış kodu ayrıca okunmadı |
| 7 Eylül 2026 | Auth yönlendirme izin listesine iki adres eklendi | Supabase paneli | **ürün sahibi beyanı** | Ajan doğrulayamaz: GoTrue izinli olmayan bir `redirect_to`'yu hata vermeden Site URL'e düşürür, yani ayar dışarıdan gözlenemiyor. Kanıt, sahibin bildirimidir |
| 7 Eylül 2026 | Diff incelemesi | yerel | yapıldı — **öz-inceleme**, bağımsız inceleme değil | Kapsam dışı değişiklik yok; `supabase/.temp/cli-latest` bilerek commit'e alınmadı |

### Kapının dördü koşuldu, biri ortam yüzünden koşulamadı

İlk kayıt "ajan kapıyı hiç koşamaz" diyordu; bu fazla geniş bir ifadeydi ve düzeltildi.
Ürün sahibinin macOS `node_modules`'una dokunmamak için depo, cihazın Linux VM'inde
**bağlı klasörün dışına** kopyalandı (`$HOME/work`), orada sıfırdan
`pnpm install --frozen-lockfile` yapıldı ve kapı adımları CI'ın kullandığı sentetik
ortam değişkenleriyle koşuldu. Beş adımın **dördü geçti**.

Beşinci adım `next build`, kodla ilgisiz bir sebeple duruyor: `app/layout.tsx`
`next/font/google` ile `Manrope` ve `Noto Serif` yazı tiplerini derleme anında indiriyor
ve her iki ajan ortamının egress proxy'si de `fonts.googleapis.com` ile
`fonts.gstatic.com`'u 403 ile kesiyor. Bu, 6 Eylül'de de kaydedilmiş aynı engeldir ve
o gün derleme ürün sahibinin macOS'unda geçmişti. Dolayısıyla bu satır **başarısız değil,
değerlendirilemedi**; sonucu ancak macOS'ta ya da CI'da alınabilir. Kalan tek komut:

    cd /Users/alidiyarduran/Antigravity/genovakorist && pnpm build

### Uygulanmadan önce gereken canlı yapılandırma — kod değil, panel ayarı

`emailRedirectTo` ve `redirectTo` adresleri Supabase Auth'un **izinli yönlendirme adresleri**
listesinde yoksa Supabase onları yok sayar ve yine Site URL'e döner; yani düzeltme sessizce
etkisiz kalır. `supabase/config.toml` bu listeyi taşımıyor (dosya yalnız fonksiyon
`verify_jwt` ayarlarını içeriyor), dolayısıyla ayar panelden yapılır. Gereken iki adres:

- `https://app.genesinovachoir.com/invite`
- `https://app.genesinovachoir.com/auth/recovery`

Bu adım ürün sahibine aittir; bu brief canlı yapılandırma yetkisi vermiyor ve aşağıdaki
tabloda ayrı bir satır olarak **NOT RUN** duruyor.

**Teslim:** commit'ler `3986f35`, `f9e70c7`, `35fe913` ve bu kayıt. Kapının beş adımı da
geçti ve yönlendirme adresleri eklendi. Kalan iki ölçüt tarayıcı davranışıyla ilgili ve
ancak canlı akışta görülebilir: doğrulama dönüşünün `/invite`'a düşmesi ve kurtarma
oturumunun eski yolunun bozulmamış olması. İkisi de 011 yayına girmeden ölçülemez, yani
sıradaki adım bu değişikliğin yayınlanmasıdır — ayrı yetki ister ve 010'un kalan
maddelerinden sonra gelir.

## Yayın ve tarayıcı regresyonu — 7-8 Eylül 2026

011 ürün sahibinin onayıyla yayına alındı: `main` `6b6d9a4..a912089`, 12 commit. Aralıktaki
tek ürün kodu 011'dir; kalanı belge ve zaten canlıya uygulanmış 012 SQL'idir.

**İlk koşu kırmızı geldi ve sebebi tam olarak bu değişiklikti** — bu yüzden de değerliydi:

Koşu [#34162690120](https://github.com/genesinovachoir/genova_app/actions/runs/34162690120),
`Quality and security` ve `Native product checks` yeşil, `Browser regression` **kırmızı**:
`tests/e2e/invitations.spec.ts:9` iki tarayıcı projesinde de düştü. Beklenen "Doğrulama
e-postanızı kontrol edin" yerine "Kayıt tamamlanamadı." görülüyordu.

Sebep: test `page.route('**/auth/v1/signup', …)` ile kayıt çağrısını taklit ediyordu.
`emailRedirectTo` eklenince supabase-js aynı çağrıyı `?redirect_to=…` sorgu dizesiyle
gönderiyor ve Playwright'ın glob'u sorgu dizesi olan adrese uymuyor. Taklit devreye
girmeyince istek gerçek sunucuya gidiyor ve hata dönüyor. Yani test, davranışın
**değiştiğini** doğru şekilde yakaladı; kusur üründe değil, testin kalıbındaydı.

Kalıp `'**/auth/v1/signup*'` yapıldı ve testler daraltılmak yerine **genişletildi**: artık
`redirect_to`'nun tam olarak `/invite` olduğunu ve ham token'ın sorgu dizesinde hiç
görünmediğini de doğruluyorlar. Ayrıca dört yeni tarayıcı testi eklendi: fragment'siz
dönüşte davetin korunması, bozuk depo kaydının yok sayılması, sıfırlama isteğinin tek tip
yanıtı ve geçersiz adresin ağ çağrısından önce reddi.

Kayıt notu: CI günlüklerinin barındığı sunucuya ajan ortamından çıkılamıyor; hata
GitHub API'sinin **annotation** uçundan okundu, günlük dosyasından değil.

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
| Repository gate, steps 1-4: `lint`, `typecheck`, `test:coverage`, `test:service-worker` | yes | **PASS** | 7 Sep 2026, `3986f35`, clean Linux install outside the connected folder, CI's synthetic environment | All four exited 0; 33 test files / 206 tests. The owner's macOS install was not touched |
| Repository gate, step 5: `pnpm build` | yes | **PASS** | 7 Sep 2026, owner's macOS, `pnpm build` at the repository root | Output ends with the complete route table and returns to a clean prompt, which only happens on a successful build. Owner-run and owner-pasted; the exit code itself was not read. In the agent environment the same command stops at the Google Fonts fetch, and a font-stubbed run there compiled and prerendered all 17 pages |
| Supabase Auth redirect allow-list contains `/invite` and `/auth/recovery` | yes | **PASS (owner-reported)** | 7 Sep 2026, Supabase dashboard | Owner states both URLs were added. Not agent-verifiable: GoTrue silently falls back to the site URL for a disallowed `redirect_to` rather than erroring, so the setting cannot be observed from outside |
| Real email round trip through the live project | N/A — this brief grants no live or email authority | N/A | — | Live acceptance belongs to 010 |

Required criteria: 13. Passed: 11. Not run: 2. This is a count of required criteria that
actually passed, not a quality score; the task stays **partial** until the four run.

Review the diff against the brief after testing and record whether the review was
self-review or an independent review.

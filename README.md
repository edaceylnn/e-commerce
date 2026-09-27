# Beauty Store — E-ticaret Portfolio Demo

Next.js 16 (App Router) ile geliştirilmiş, bir kozmetik e-ticaret sitesini
taklit eden bir portföy projesi. Bir iş ilanında istenen yetkinlikleri
(Next.js, REST & GraphQL tüketimi, state management, güvenli oturum
yönetimi, push bildirimleri, Vercel/edge farkındalığı ve test altyapısı)
tek, çalışan bir uygulamada göstermek amacıyla yazıldı.

> Bu proje bir portföy demosudur; gerçek bir şirket veya sistemle hiçbir
> bağlantısı yoktur. Ürün verileri [DummyJSON](https://dummyjson.com)
> üzerinden gelir. Görsel tasarım dili (renkler, tipografi, düzen), Figma
> Community'deki bir "Skin Care E-commerce Website Design" konseptinden
> ilham alınarak uyarlandı; stok fotoğrafları kopyalanmadı, tüm ürün
> görselleri DummyJSON'dan gelir.

## Neyi, neden gösteriyor

| Yetkinlik                          | Nerede                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| Next.js ile production web app       | Tüm `src/app` — App Router, Server Components, Route Handlers                          |
| Veritabanı / ORM                    | [`prisma/schema.prisma`](prisma/schema.prisma) — Postgres + Prisma; ürün kataloğu, kullanıcılar, siparişler, yorumlar vb. için tek şema |
| REST API tüketimi                   | [`prisma/seed.ts`](prisma/seed.ts) — kataloğu tek seferlik DummyJSON'dan çekip kendi veritabanımıza aktarıyor |
| GraphQL (inşa + tüketim)             | [`src/app/api/graphql/route.ts`](src/app/api/graphql/route.ts) (graphql-yoga) + [`ReviewSection.tsx`](src/components/ReviewSection.tsx) (urql); resolver'lar Postgres'teki `Review` tablosuna yazıyor |
| Üçüncü taraf ödeme entegrasyonu (iyzico) | [`src/lib/iyzico.ts`](src/lib/iyzico.ts) — HMACSHA256 imzalama elle yazıldı; [`src/app/checkout/`](src/app/checkout) — adres → özet → ödeme → onay akışı |
| Rol tabanlı admin paneli              | [`src/app/admin/`](src/app/admin) — ürün/sipariş/kullanıcı/kupon yönetimi, `src/app/api/admin/*` |
| State management                     | [`src/lib/store/cart-store.ts`](src/lib/store/cart-store.ts) — Zustand + localStorage persist |
| Güvenli kimlik doğrulama              | [`src/lib/auth.ts`](src/lib/auth.ts) — `jose` ile imzalı JWT, httpOnly/secure/sameSite cookie; parolalar `bcrypt` ile hash'lenir ([`src/lib/password.ts`](src/lib/password.ts)); rol tabanlı erişim (`CUSTOMER`/`ADMIN`) ile korunan [`/admin`](src/app/admin/layout.tsx) |
| Push bildirimleri                    | [`src/lib/push/`](src/lib/push) + [`public/sw.js`](public/sw.js) — gerçek Web Push (VAPID), abonelikler Postgres'te (`PushSubscription`) |
| Deep link / yönlendirme yönetimi     | [`src/proxy.ts`](src/proxy.ts) — eski `/urun/:id` bağlantılarını `/products/:id`'e yönlendirir |
| Vercel / edge farkındalığı           | `src/proxy.ts` (edge'e yakın çalışan proxy katmanı) + README'deki "Next.js 16 notları" |
| Test pratikleri (Jest, RTL, Playwright)| [`src/**/*.test.ts(x)`](src/lib/store/cart-store.test.ts) + [`e2e/`](e2e) |
| Agile/Scrum işbirliği                | Bu README'deki mimari kararlar ve gerekçeleri; kod incelemesinde tartışılabilir |

React Native / mobil ve FCM/APNs maddeleri kapsam dışı bırakıldı — bu proje
bilinçli olarak **sadece web** (Next.js) kapsamında tutuldu. Push bildirimleri
gerçek Web Push standardıyla (FCM/APNs'in tarayıcı eşdeğeri) uygulandı.

## Mimari notlar

- **Ürün kataloğu**: `beauty`, `skin-care`, `fragrances` kategorileri kendi
  Postgres veritabanımızda tutuluyor ([`src/lib/products.ts`](src/lib/products.ts),
  Prisma ile sorgulanıyor). Katalog, [`prisma/seed.ts`](prisma/seed.ts)
  tarafından tek seferlik olarak DummyJSON'dan içe aktarıldı — çalışma
  zamanında artık DummyJSON'a istek atılmıyor. Fiyatlar TRY olarak kabul
  edildi (DummyJSON'un USD rakamları kur çevrimi yapılmadan TRY'ye eşleniyor
  — bkz. `prisma/seed.ts` içindeki not); bu aynı zamanda önceki sürümdeki
  `$`/`₺` tutarsızlığını da giderdi.
- **Yorumlar (GraphQL)**: Kendi GraphQL şemamız (`graphql-yoga`, bellek içi
  veri deposu) hem sorgu hem mutation içeriyor; istemcide `urql` ile
  tüketiliyor. Bu, "hem REST hem GraphQL ile çalışabilme" gereksinimini
  gerçek, uçtan uca çalışan bir örnekle gösteriyor.
- **Sepet**: Zustand store, `persist` middleware ile localStorage'a yazıyor.
  Hydration uyumsuzluğunu önlemek için `useSyncExternalStore` tabanlı bir
  `useHasMounted` hook'u kullanılıyor (bkz. `src/lib/use-has-mounted.ts`).
- **Oturum/kimlik doğrulama**: `/api/auth/register` ve `/api/auth/login`
  kullanıcıyı Postgres'teki `User` tablosuna karşı doğruluyor (parola
  `bcrypt` ile hash'lenip saklanıyor), başarılı olursa bir JWT üretip httpOnly
  cookie olarak yazıyor; `/account` sayfası bu cookie'yi **sunucu
  bileşeninde** okuyup ilk render'ı sunucu tarafında dolduruyor (client-side
  fetch waterfall yok). Her kullanıcının bir `role`'ü (`CUSTOMER`/`ADMIN`) var;
  `/admin` altındaki tüm sayfalar `src/app/admin/layout.tsx`'te sunucu
  tarafında bu rolü kontrol ediyor.
- **Push bildirimleri**: `web-push` + VAPID anahtarlarıyla gerçek bir Web
  Push akışı var: tarayıcı izni → service worker kaydı → `PushManager`
  aboneliği → sunucuda saklanan abonelik → `web-push` ile bildirim gönderimi.
- **Adresler & hesap bilgileri**: `/account/adresler`'da kullanıcı kendi
  adres defterini yönetir (ekle/düzenle/sil); her adres `Teslimat` veya
  `Fatura` etiketiyle kaydedilir ([`src/components/AddressForm.tsx`](src/components/AddressForm.tsx)),
  ama bu sadece bir varsayılan/organizasyon etiketi — checkout'ta herhangi
  bir adres her iki rol için de seçilebilir. `Order` tablosunda
  `shippingAddressId`/`billingAddressId` **iki ayrı alan** olarak tutuluyor
  (bkz. `prisma/migrations/..._split_shipping_billing_address`) — aynı adres
  kullanılsa bile teslimat ve fatura adresi veri modelinde birbirinden
  bağımsız. `/account/profil`'de ad/soyad, e-posta, telefon ve doğum tarihi
  güncellenebilir (oturum çerezi yeniden imzalanır) ve parola değiştirilebilir
  (mevcut parola doğrulaması ile).
- **Hesap paneli**: `/account` altındaki tüm sayfalar
  [`src/app/account/layout.tsx`](src/app/account/layout.tsx)'in sağladığı ortak
  bir "Genel Bakış + sol menü + sağ panel" kabuğunu paylaşıyor
  ([`AccountSidebar.tsx`](src/components/AccountSidebar.tsx) — masaüstünde
  dikey menü, mobilde yatay kaydırmalı sekme çubuğu). Giriş yapan kullanıcı
  `/account`'ta karşılama kartı (ad, e-posta, "Hesap Bilgilerini Düzenle"),
  Siparişlerim/Adreslerim/Favorilerim'e hızlı erişim kartları ve son
  siparişlerin durum rozetleriyle listelendiği bir özet görür.
  `/account/bildirimler`'de kampanya/sipariş durumu/yeni ürün bildirimleri
  için ayrı ayrı açılıp kapatılabilen tercihler var
  ([`NotificationPreferencesForm.tsx`](src/components/NotificationPreferencesForm.tsx));
  gerçek push bildirimi gönderme aracı sadece admin panelinde
  ([`/admin/notifications`](src/app/admin/notifications)) — müşteri tarafında
  hiçbir geliştirici/test amaçlı özellik yok.
- **Checkout & ödeme (iyzico)**: `/cart`'taki "Ödemeye Geç" artık gerçek bir
  akışa götürüyor: `/checkout/address` (teslimat adresi seçimi/eklenmesi,
  "fatura adresim aynı" seçeneği kapatılırsa ayrı bir fatura adresi
  seçilir) → `/checkout/review` (sepet özeti, kargo hesaplaması,
  "Ödemeyi Başlat") → sunucu tarafında [`src/lib/iyzico.ts`](src/lib/iyzico.ts)
  iyzico'nun Checkout Form (yönlendirmeli) API'sini başlatır — resmi
  `iyzipay` SDK'sı yerine düz `fetch` + elle yazılmış IYZWSv2 HMACSHA256
  imzalama kullanıyoruz (algoritma iyzico'nun kendi Node SDK kaynağından
  doğrulandı). Kullanıcı iyzico'nun barındırdığı ödeme sayfasına
  yönlendirilir; kart bilgisi hiçbir zaman bu uygulamadan geçmez.
  `/checkout/callback` iyzico'nun POST ile bıraktığı `token`'ı asla tek
  başına güvenmez — sunucu tarafında CF-Retrieve ile yeniden sorgular,
  yanıt imzasını ve ödenen tutarı doğrular, ancak o zaman siparişi
  `HAZIRLANIYOR`'a çeker. Sipariş fiyatları **her zaman sunucuda** DB'den
  yeniden hesaplanır — istemciden gelen fiyata güvenilmez. Sipariş geçmişi
  `/account/orders` altında.
  Sandbox testleri iyzico'nun resmi örnek isteklerinde kullanılan
  `identityNumber: "11111111111"` placeholder'ını kullanır — kullanıcılardan
  gerçek bir T.C. kimlik numarası toplanmaz.
- **Admin paneli** (`/admin`, sadece `role === "ADMIN"`): `src/app/admin/layout.tsx`'te
  sunucu tarafında rol kontrolü, `src/app/api/admin/*` route'ları da kendi
  başlarına aynı kontrolü tekrarlıyor (sayfa koruması tek başına yeterli
  değil). Beş ekran: **Ürünler** (tam CRUD, `Product.id` autoincrement
  olmadığı için yeni ürünler `max(id)+1` ile oluşturuluyor — bkz.
  `src/app/api/admin/products/route.ts`), **Siparişler** (durum filtresi +
  durum güncelleme), **Kullanıcılar** (rol değiştirme; admin kendi rolünü
  düşüremez), **Kuponlar** (oluştur/aktif-pasif/sil), **Bildirimler**
  (mevcut `/api/push/notify`'ı kullanan toplu gönderim). **Yorumlar** ekranı
  şimdilik bir yer tutucu — yorumlar hâlâ bellek-içi GraphQL deposunda,
  kalıcı moderasyon için DB'ye taşınmaları gerekiyor.
- **Favoriler**: `WishlistItem` tablosunda kullanıcı başına tutuluyor.
  [`WishlistButton.tsx`](src/components/WishlistButton.tsx) hem ürün
  kartlarında hem detay sayfasında kullanılıyor; anlık durum
  [`wishlist-store.ts`](src/lib/store/wishlist-store.ts)'teki hafif bir
  Zustand önbelleğinde tutuluyor (sepetin aksine localStorage'a
  yazılmıyor — sunucudaki gerçek veri her sayfa yüklemesinde
  `/api/wishlist`'ten bir kez hidrate ediliyor). `/account/favoriler`
  sayfasında listeleniyor.
- **Kuponlar (müşteri tarafı)**: `/checkout/review`'daki kupon kodu girişi
  önce `/api/checkout/coupon` ile bir önizleme doğrulaması yapıyor, ama asıl
  indirim `/api/checkout/create`'te **sunucu tarafında yeniden** hesaplanıyor
  — istemciden gelen indirime güvenilmiyor. Kuponun `usedCount`'u sadece
  ödeme `/checkout/callback`'te onaylandığında artıyor; terk edilen bir
  checkout kuponun kullanım limitini tüketmiyor.
- **Yorumlar (güncellenmiş)**: [`src/lib/graphql/schema.ts`](src/lib/graphql/schema.ts)'in
  resolver'ları artık bellek-içi değil, Postgres'teki `Review` tablosuna
  yazıyor/okuyor — GraphQL katmanı aynen korunuyor, sadece arkasındaki
  depolama değişti. Yeni yorumlar `PENDING` durumunda oluşturulur ve
  [`/admin/reviews`](src/app/admin/reviews) üzerinden bir admin
  onaylayana kadar herkese açık listede görünmez (`Query.reviews` sadece
  `APPROVED` döner). Onaylanınca `Product.ratingAvg`/`ratingCount` yeniden
  hesaplanır. Oturum açmış bir kullanıcı, o ürünü içeren teslim edilmiş
  (`TESLIM_EDILDI`) bir siparişi varsa yorumu "Doğrulanmış Alışveriş"
  rozetiyle işaretlenir. Puan girişi artık bir `<select>` değil,
  [`StarRating.tsx`](src/components/StarRating.tsx)'in tıklanabilir modu.
- **Push bildirimleri (güncellenmiş)**: [`src/lib/push/store.ts`](src/lib/push/store.ts)
  artık `PushSubscription` tablosunu kullanıyor (oturum açık olan
  kullanıcılar için `userId`'ye bağlanıyor, anonim abonelik de hâlâ
  mümkün). Bir admin, ürün stoğunu 0'dan pozitife çektiğinde
  ([`/api/admin/products/[id]`](src/app/api/admin/products/[id]/route.ts))
  tüm abonelere otomatik "tekrar stokta" bildirimi gönderiliyor.
- **Proxy (`src/proxy.ts`)**: Next.js 16'da `middleware.ts` adı `proxy.ts`
  olarak değiştirildi. Burada iki klasik retail/e-ticaret deseni gösteriliyor:
  eski/deep-link URL'lerin yönlendirilmesi ve düşük maliyetli bir A/B
  segment cookie'si atanması.

### Next.js 16 ile ilgili notlar (bu proje sırasında öğrenilenler)

Bu proje **Next.js 16** üzerine kuruldu (create-next-app anında en güncel
sürüm). Önceki sürümlere göre birkaç önemli fark koda yansıtıldı:

- `middleware.ts` → `proxy.ts` olarak yeniden adlandırıldı ve varsayılan
  olarak Node.js runtime'da çalışıyor (Edge zorunluluğu kalktı).
- Route Handler'larda ve sayfalarda `params` (ve `cookies()`, `headers()`)
  artık **Promise** — `await params` / `await cookies()` gerekiyor.
- Route seviyesinde `export const runtime = "edge"` **deprecated**; edge'e
  yakın davranış artık `proxy.ts` üzerinden sağlanıyor. Bu proje başta
  `/api/auth/me` route'unu edge runtime ile yazmıştı, build sırasında gelen
  deprecation uyarısı üzerine Node.js runtime'a geri alındı (bkz. dosyadaki
  yorum).

## Kurulum

```bash
npm install
cp .env.example .env.local
```

`.env.local` içine gerçek değerler koy:

```bash
AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
npx web-push generate-vapid-keys --json   # NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY için
```

Ödeme akışını denemek için [iyzico sandbox](https://sandbox-merchant.iyzipay.com)'tan
bir test hesabı oluşturup `IYZICO_API_KEY`/`IYZICO_SECRET_KEY` değerlerini
`.env.local`'e ekle (`IYZICO_BASE_URL` sandbox için zaten doğru değere
ayarlı). Bu anahtarlar olmadan checkout, adres/sipariş özeti adımlarını
tamamen çalışır şekilde gösterir; sadece "Ödemeyi Başlat" adımı iyzico'ya
bağlanamadığı için kullanıcı dostu bir hata mesajıyla sonuçlanır.

`DATABASE_URL` için bir Postgres veritabanı gerekiyor. Yerelde en hızlı yol:

```bash
createdb beauty_ecommerce
# .env.local içine: DATABASE_URL=postgresql://<kullanıcı-adın>@localhost:5432/beauty_ecommerce?schema=public
```

(Docker tercih edersen `docker run --name beauty-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres` de
kullanılabilir — bağlantı dizesini ona göre güncelle. Üretimde
[Neon](https://neon.tech) gibi serverless bir Postgres sağlayıcısı öneriyoruz.)

Şemayı uygula, kataloğu ve bir admin kullanıcıyı içe aktar:

```bash
npx prisma migrate dev
npx prisma db seed
```

`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (`.env.local`'de) seed sırasında
oluşturulacak admin hesabının bilgilerini belirler.

```bash
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde açılır.

## Test

```bash
npm test          # Jest + React Testing Library (unit)
npm run test:e2e  # Playwright (e2e) — dev server'ı otomatik ayağa kaldırır
```

## Production build

```bash
npm run build
npm start
```

## Vercel'e deploy

Proje herhangi bir ek yapılandırma gerektirmeden Vercel'e deploy edilebilir.
Gereken, yukarıdaki ortam değişkenlerini (üretimde `DATABASE_URL` için
[Neon](https://neon.tech) gibi serverless bir Postgres öneriyoruz) Vercel
proje ayarlarına eklemek. `src/proxy.ts` Vercel'in proxy/edge katmanında,
geri kalan route'lar Node.js runtime'da çalışır.

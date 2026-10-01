# Mimari notlar

README'deki özetin ayrıntıları: mağaza arayüzü ve tasarım sistemi, katalog,
sepet, oturum, checkout, admin ve diğer parçaların nasıl çalıştığı. Stok
rezervasyonu, kargo, fatura, e-posta, demo modu ve Shopify CSV için README'deki
"Zor kısımlar" bölümüne ve ilgili dosyaların başındaki açıklamalara bakın.

## Mağaza arayüzü ve tasarım sistemi

Mağaza tarafı (`src/app/(site)`) sade, görsel ağırlıklı bir editoryal dile
göre tasarlandı. Admin paneli (`src/app/admin`) kendi ayrı token setini
(`--adm-*`) kullanır ve bu sistemden etkilenmez.

- **Tokenlar** — [`src/app/globals.css`](../src/app/globals.css): sıcak taş
  tonlarında bir palet, tek mürekkep rengi, anlamlı tek renk olarak indirim
  ve hata için pas kırmızısı (`--sale`). Köşeler kare; gölge ve gradyan yok.
  Tipografi tek aile: **Hanken Grotesk** 300/400/500
  ([`src/app/layout.tsx`](../src/app/layout.tsx)).
- **Sayfa container'ı** — `page-x` utility'si: içerik en fazla 1280px,
  kenar boşluğu mobilde 20px, ≥760px'te 40px. Header, footer ve tüm
  bölümler aynı hizada ilerler; yalnızca ana sayfa hero'su tam genişliktir.
  `full-bleed` ve `bleed-gutter` utility'leri çizgilerin ve yatay kayan
  satırların container dışına taşmasını sağlar.
- **Kırılma noktaları** — Tailwind varsayılanlarına dokunmadan eklendi:
  `tab` (≥760px), `desk` (≥1100px), `wide` (≥1280px), `hdr` (≥1360px, tek
  satırlı header).
- **İkonlar** — Phosphor (Light, kaydedilmiş favori için Fill),
  [`src/components/icons/Ph.tsx`](../src/components/icons/Ph.tsx) üzerinden
  ikon başına import edilir; server component'lerde de çalışır.
- **Ürün kartı** — [`ProductCard.tsx`](../src/components/ProductCard.tsx):
  2:3 görsel, favori kalbi, masaüstünde üzerine gelince bedene göre hızlı
  ekleme şeridi, mobilde hızlı görünüm, renk seçenekleri. Kart, hızlı görünüm
  ve ürün sayfası sepete ekleme için tek bir hook kullanır
  ([`use-add-to-bag.ts`](../src/lib/use-add-to-bag.ts)); fiyat, varyant ve
  görsel hesapları DB'ye dokunmayan
  [`product-view.ts`](../src/lib/product-view.ts) içindedir, bu yüzden istemci
  bileşenleri Prisma/pg'yi pakete çekmez.
- **Sayfalar**:
  - Ana sayfa ([`page.tsx`](../src/app/%28site%29/page.tsx), bölümler
    [`src/components/home/`](../src/components/home)): hero, kategori kartları,
    sezon seçkisi, satış adedine göre "Çok Satanlar", Spor bölümü, kategori
    listesi, yeni gelenler şeridi, yaşam tarzı bloğu, bülten.
  - Kategori ([`ProductListing.tsx`](../src/components/plp/ProductListing.tsx)):
    sticky araç çubuğu, sayılı sekmeler, 3/4 sütun görünüm, sıralama, anlık
    çalışan filtre çekmecesi (beden, renk, fiyat, tip, stok), "daha fazla
    yükle". Filtreler ve sıralama URL'de tutulur
    ([`product-filters.ts`](../src/lib/product-filters.ts)).
  - Ürün detay ([`ProductDetail.tsx`](../src/components/pdp/ProductDetail.tsx)):
    galeri ve tam ekran görüntüleyici, sticky satın alma paneli, beden
    doğrulaması, ürünün beden tablosundan beslenen beden rehberi, akordeonlar,
    "Kombini tamamla", mobilde sabit sepet çubuğu.
  - Sepet ve hesap sayfaları aynı tasarım diline taşındı; sepetten silinen
    ürün bildirimdeki "Geri al" ile geri eklenebilir.
- **"Yeni Gelenler" tanımı** — [`selectNewArrivals`](../src/lib/products.ts):
  önce `isNew` işaretli ürünler, sonra en son eklenenler (toplam 8). Ana sayfa
  şeridi, `/products?filter=new` ve kategori listesindeki sayı aynı kümeyi
  gösterir.

## Katalog, sepet, checkout ve admin

- **Ürün kataloğu**: `loungewear`, `spor`, `pijama` kategorileri ve
  ürünler, renk/beden varyantları kendi Postgres veritabanımızda tutuluyor
  ([`src/lib/products.ts`](../src/lib/products.ts), Prisma ile sorgulanıyor).
  Katalog [`prisma/seed.ts`](../prisma/seed.ts)'te statik olarak tanımlı;
  çalışma zamanında harici bir katalog servisine istek atılmıyor. Seed
  upsert'lerle çalışır; tekrar çalıştırmak kataloğu yerinde günceller.
  Fiyatlar TRY'dir.
- **Sepet**: Zustand store, `persist` middleware ile localStorage'a yazıyor.
  Hydration uyumsuzluğunu önlemek için `useSyncExternalStore` tabanlı bir
  `useHasMounted` hook'u kullanılıyor (bkz. `src/lib/use-has-mounted.ts`).
  Sepet sayfası canlı stok durumunu `/api/cart/lines`'tan, otomatik
  kampanya indirimini `/api/checkout/campaign-preview`'dan alır.
- **Oturum/kimlik doğrulama**: `/api/auth/register` ve `/api/auth/login`
  kullanıcıyı Postgres'teki `User` tablosuna karşı doğruluyor (parola
  `bcrypt` ile hash'lenip saklanıyor), başarılı olursa bir JWT üretip httpOnly
  cookie olarak yazıyor; `/account` sayfası bu cookie'yi **sunucu
  bileşeninde** okuyup ilk render'ı sunucu tarafında dolduruyor (client-side
  fetch waterfall yok). Her kullanıcının bir `role`'ü (`CUSTOMER`/`ADMIN`) var;
  `/admin` altındaki tüm sayfalar
  [`src/app/admin/(dashboard)/layout.tsx`](../src/app/admin/%28dashboard%29/layout.tsx)'te
  sunucu tarafında bu rolü kontrol ediyor.
- **Hesap paneli**: `/account` altındaki sayfalar
  [`src/app/(site)/account/layout.tsx`](../src/app/%28site%29/account/layout.tsx)'in
  sağladığı ortak kabuğu paylaşıyor: karşılama başlığı, solda metin menü
  ([`AccountSidebar.tsx`](../src/components/AccountSidebar.tsx) — mobilde yatay
  kaydırmalı sekmeler) ve sağda içerik. Genel bakış, siparişler, adresler,
  profil, şifre, bildirim tercihleri ve favoriler burada.
- **Adresler**: `/account/adresler`'da kullanıcı kendi adres defterini yönetir
  (ekle/düzenle/sil); her adres `Teslimat` veya `Fatura` etiketiyle kaydedilir
  ([`src/components/AddressForm.tsx`](../src/components/AddressForm.tsx)), ama
  bu sadece bir varsayılan/organizasyon etiketi — checkout'ta herhangi bir
  adres her iki rol için de seçilebilir. `Order` tablosunda
  `shippingAddressId`/`billingAddressId` **iki ayrı alan** olarak tutuluyor —
  aynı adres kullanılsa bile teslimat ve fatura adresi veri modelinde
  birbirinden bağımsız. `/account/profil`'de ad/soyad, e-posta, telefon ve
  doğum tarihi güncellenebilir (oturum çerezi yeniden imzalanır) ve parola
  değiştirilebilir (mevcut parola doğrulaması ile).
- **Checkout & ödeme (iyzico)**: `/cart`'taki "Ödemeye geç" gerçek bir
  akışa götürüyor: `/checkout/address` (teslimat adresi seçimi/eklenmesi,
  "fatura adresim aynı" seçeneği kapatılırsa ayrı bir fatura adresi
  seçilir) → `/checkout/review` (sepet özeti, kupon, kargo hesaplaması,
  "Ödemeyi Başlat") → sunucu tarafında [`src/lib/iyzico.ts`](../src/lib/iyzico.ts)
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
- **Kargo**: ücretsiz kargo eşiği ve sabit kargo ücreti tek bir yerde
  ([`src/lib/shipping.ts`](../src/lib/shipping.ts)); checkout API'si, sepet
  özeti, duyuru çubuğu ve ürün sayfasındaki bilgi satırları aynı değeri
  kullanır.
- **Kuponlar ve kampanyalar**: `/checkout/review`'daki kupon kodu girişi
  önce `/api/checkout/coupon` ile bir önizleme doğrulaması yapıyor, ama asıl
  indirim `/api/checkout/create`'te **sunucu tarafında yeniden** hesaplanıyor
  — istemciden gelen indirime güvenilmiyor. Kupon ve otomatik kampanya
  üst üste binmez; hangisi büyükse o uygulanır. Kuponun `usedCount`'u sadece
  ödeme `/checkout/callback`'te onaylandığında artıyor; terk edilen bir
  checkout kuponun kullanım limitini tüketmiyor.
- **Admin paneli** (`/admin`, sadece `role === "ADMIN"`): sayfa koruması
  layout'ta yapılıyor, `src/app/api/admin/*` route'ları da kendi başlarına
  aynı kontrolü tekrarlıyor (sayfa koruması tek başına yeterli değil).
  Ekranlar: genel bakış ve analitik, ürünler (tam CRUD; `Product.id`
  autoincrement olmadığı için yeni ürünler bir sonraki boş id'yi alır — aynı
  anda oluşturulan iki ürün aynı id'yi almasın diye bir advisory lock
  altında; bkz. [`src/lib/product-ids.ts`](../src/lib/product-ids.ts)), kategoriler, markalar,
  koleksiyonlar, renkler, bedenler ve beden tabloları, stok durumu (kritik
  ve tükenen filtreleriyle) ve stok hareketleri, siparişler ve iadeler,
  kampanyalar ve kuponlar, yorum moderasyonu, müşteriler, e-postalar,
  bildirimler ve ayarlar.
- **Favoriler**: `WishlistItem` tablosunda kullanıcı başına tutuluyor.
  [`WishlistButton.tsx`](../src/components/WishlistButton.tsx) hem ürün
  kartlarında hem detay sayfasında kullanılıyor; anlık durum
  [`wishlist-store.ts`](../src/lib/store/wishlist-store.ts)'teki hafif bir
  Zustand önbelleğinde tutuluyor (sepetin aksine localStorage'a
  yazılmıyor — sunucudaki gerçek veri her sayfa yüklemesinde
  `/api/wishlist`'ten bir kez hidrate ediliyor). `/account/favoriler`
  sayfasında listeleniyor.
- **Yorumlar (GraphQL)**: [`src/lib/graphql/schema.ts`](../src/lib/graphql/schema.ts)
  hem sorgu hem mutation içeriyor; istemcide `urql` ile tüketiliyor.
  Resolver'lar Postgres'teki `Review` tablosuna yazıyor/okuyor. Yeni yorumlar
  `PENDING` durumunda oluşturulur ve [`/admin/reviews`](../src/app/admin/%28dashboard%29/reviews)
  üzerinden bir admin onaylayana kadar herkese açık listede görünmez
  (`Query.reviews` sadece `APPROVED` döner). Onaylanınca
  `Product.ratingAvg`/`ratingCount` yeniden hesaplanır. Oturum açmış bir
  kullanıcının o ürünü içeren teslim edilmiş (`TESLIM_EDILDI`) bir siparişi
  varsa yorumu "Doğrulanmış alışveriş" olarak işaretlenir.
- **Push bildirimleri**: `web-push` + VAPID anahtarlarıyla gerçek bir Web
  Push akışı var: tarayıcı izni → service worker kaydı → `PushManager`
  aboneliği → sunucuda saklanan abonelik → `web-push` ile bildirim gönderimi.
  [`src/lib/push/store.ts`](../src/lib/push/store.ts) `PushSubscription`
  tablosunu kullanıyor (oturum açık kullanıcılar için `userId`'ye bağlanıyor,
  anonim abonelik de mümkün). Bir admin ürün stoğunu 0'dan pozitife
  çektiğinde tüm abonelere otomatik "tekrar stokta" bildirimi gönderiliyor.
  Müşteriler `/account/bildirimler`'da bildirim tercihlerini yönetir; toplu
  gönderim aracı sadece admin panelinde.
- **Proxy (`src/proxy.ts`)**: Next.js 16'da `middleware.ts` adı `proxy.ts`
  olarak değiştirildi. Burada iki klasik retail/e-ticaret deseni gösteriliyor:
  eski/deep-link URL'lerin yönlendirilmesi ve düşük maliyetli bir A/B
  segment cookie'si atanması.

## Next.js 16 ile ilgili notlar (bu proje sırasında öğrenilenler)

Bu proje **Next.js 16** üzerine kuruldu (create-next-app anında en güncel
sürüm). Önceki sürümlere göre birkaç önemli fark koda yansıtıldı:

- `middleware.ts` → `proxy.ts` olarak yeniden adlandırıldı ve varsayılan
  olarak Node.js runtime'da çalışıyor (Edge zorunluluğu kalktı).
- Route Handler'larda ve sayfalarda `params`, `searchParams` (ve `cookies()`,
  `headers()`) artık **Promise** — `await params` / `await cookies()` gerekiyor.
- Route seviyesinde `export const runtime = "edge"` **deprecated**; edge'e
  yakın davranış artık `proxy.ts` üzerinden sağlanıyor. Bu proje başta
  `/api/auth/me` route'unu edge runtime ile yazmıştı, build sırasında gelen
  deprecation uyarısı üzerine Node.js runtime'a geri alındı (bkz. dosyadaki
  yorum).
- `"use client"` bileşenleri yalnızca **tip** olarak `@/lib/products`'tan
  import edebilir; çalışma zamanı importu Prisma/pg'yi tarayıcı paketine
  çeker ve derleme `Module not found: Can't resolve 'dns'` hatasıyla durur.
  İstemci tarafında gereken saf yardımcılar bu yüzden
  [`src/lib/product-view.ts`](../src/lib/product-view.ts) ve
  [`src/lib/categories.ts`](../src/lib/categories.ts) gibi DB'siz modüllerde.

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import type { Product, ProductExtras } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import {
  SWATCH_RING,
  colorSwatches,
  discountedPrice,
  priceFor,
  sizeOptions,
} from "@/lib/product-view";
import { useAddToBag } from "@/lib/use-add-to-bag";
import { WishlistButton } from "@/components/WishlistButton";
import { NotifyMeButton } from "@/components/NotifyMeButton";
import { Drawer } from "@/components/ui/Drawer";
import { ImageViewer } from "@/components/pdp/ImageViewer";
import { SizeChartTable } from "@/components/pdp/SizeChartTable";
import {
  ArrowUUpLeftIcon,
  ArrowsOutSimpleIcon,
  LockSimpleIcon,
  MinusIcon,
  PlusIcon,
  TruckIcon,
} from "@/components/icons/Ph";

// Desktop gallery rhythm from the handoff: front + back (2:3), a lifestyle
// shot across both columns (4:5), then detail + fabric (3:4). A single
// image spans both columns at 4:5.
function galleryCell(i: number, count: number) {
  if (count === 1) return { span: "col-span-2", ratio: "aspect-[4/5]" };
  if (i === 2) return { span: "col-span-2", ratio: "aspect-[4/5]" };
  if (i === 3 || i === 4) return { span: "col-span-1", ratio: "aspect-[3/4]" };
  return { span: "col-span-1", ratio: "aspect-[2/3]" };
}

const QUIET_LINK =
  "text-[12px] text-ink-soft underline decoration-disabled underline-offset-4 transition-colors hover:text-ink";

export function ProductDetail({ product, extras }: { product: Product; extras: ProductExtras }) {
  const swatches = colorSwatches(product);
  const [colorId, setColorId] = useState<string | null>(swatches[0]?.colorId ?? null);
  const [size, setSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [added, setAdded] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [openAcc, setOpenAcc] = useState<Set<string>>(new Set(["desc"]));
  const [stripIndex, setStripIndex] = useState(0);
  const sizeRef = useRef<HTMLDivElement>(null);
  const addToBag = useAddToBag(product);

  const options = sizeOptions(product, colorId);
  const hasSizes = options.length > 0;
  const selected = options.find((o) => o.label === size) ?? null;
  const variant = selected?.variant ?? null;
  const colorName = swatches.find((s) => s.colorId === colorId)?.name;
  const soldOut = product.stock <= 0 || (hasSizes && options.every((o) => !o.available));
  const onSale = product.discountPercentage > 0 && !variant;
  const price = variant ? priceFor(product, variant) : discountedPrice(product);

  // Colour change: keep the size only if it's still available in the new colour.
  function pickColor(id: string) {
    if (size && !sizeOptions(product, id).find((o) => o.label === size)?.available) setSize(null);
    setColorId(id);
  }

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2200);
    return () => clearTimeout(t);
  }, [added]);

  const colorImages = colorId ? product.images.filter((img) => img.colorId === colorId) : [];
  const gallery = (
    colorImages.length > 0
      ? colorImages
      : product.images.length > 0
        ? product.images
        : [{ url: product.thumbnail, colorId: null, altText: null }]
  ).map((img) => ({ url: img.url, alt: img.altText ?? product.title }));

  function handleAdd() {
    if (soldOut) return;
    if (hasSizes && !selected) {
      setSizeError(true);
      sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    addToBag(selected?.variant ?? null);
    setAdded(true);
  }

  const unavailable = options.filter((o) => !o.available).map((o) => o.label);
  let statusLine: ReactNode = null;
  if (sizeError) statusLine = <span className="text-sale">Lütfen bir beden seç.</span>;
  else if (selected?.variant && selected.variant.stock <= 5)
    statusLine = `${selected.label} bedende son ${selected.variant.stock} ürün`;
  else if (!hasSizes && product.stock > 0 && product.stock <= 5)
    statusLine = `Son ${product.stock} ürün`;
  else if (unavailable.length > 0 && !soldOut)
    statusLine = `${unavailable.join(", ")} beden${colorName ? ` ${colorName} renginde` : ""} tükendi`;

  const toggleAcc = (key: string) =>
    setOpenAcc((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const accordions: { key: string; title: string; body: ReactNode }[] = [
    { key: "desc", title: "Açıklama", body: <p>{product.description}</p> },
    ...(extras.composition || extras.care
      ? [
          {
            key: "care",
            title: "İçerik & Bakım",
            body: (
              <>
                {extras.composition && <p>{extras.composition}</p>}
                {extras.care && <p>{extras.care}</p>}
              </>
            ),
          },
        ]
      : []),
    ...(extras.sizeChart
      ? [
          {
            key: "fit",
            title: "Kalıp & Ölçüler",
            body: (
              <>
                <p>Vücut ölçüleri, {extras.sizeChart.unit} cinsinden.</p>
                <SizeChartTable chart={extras.sizeChart} />
              </>
            ),
          },
        ]
      : []),
    {
      key: "delivery",
      title: "Teslimat",
      body: (
        <p>
          Siparişler ödeme onayından sonra 1-3 iş günü içinde kargoya verilir; teslimat bölgeye
          göre 1-5 iş günü sürer. {formatPrice(FREE_SHIPPING_THRESHOLD)} ve üzeri siparişlerde
          kargo ücretsizdir.
        </p>
      ),
    },
    {
      key: "returns",
      title: "İade",
      body: (
        <p>
          Teslim aldığın tarihten itibaren 14 gün içinde, kullanılmamış ve orijinal ambalajında
          iade edebilirsin. Ödemen 5-7 iş günü içinde iade edilir.
        </p>
      ),
    },
  ];

  const addLabel = soldOut ? "Tükendi" : added ? "Sepete eklendi" : "Sepete ekle";

  return (
    <>
      <section className="page-x grid grid-cols-12 items-start gap-x-2 pt-5">
        {/* Mobile gallery: full-bleed scroll-snap strip + thin-line indicator. */}
        <div className="relative col-span-12 mx-[calc(var(--gutter)*-1)] tab:hidden">
          <div
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
            onScroll={(e) => {
              const el = e.currentTarget;
              setStripIndex(Math.round(el.scrollLeft / el.clientWidth));
            }}
          >
            {gallery.map((img, i) => (
              <div key={`${img.url}-${i}`} className="relative aspect-[2/3] w-full flex-none snap-start bg-cream-deep">
                <Image src={img.url} alt={img.alt} fill priority={i === 0} sizes="100vw" className="object-cover" />
                <EnlargeButton onClick={() => setViewerIndex(i)} />
              </div>
            ))}
          </div>
          {gallery.length > 1 && (
            <div className="flex justify-center gap-1 pt-3.5">
              {gallery.map((img, i) => (
                <span
                  key={`${img.url}-${i}`}
                  className={`h-px w-[18px] transition-colors ${i === stripIndex ? "bg-ink" : "bg-line-strong"}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop/tablet gallery. */}
        {/* Gallery in columns 1–7, panel in 8–12 with a 40px inset — the
            handoff's 9–12 panel left an empty column (90-160px) between them. */}
        <div className="col-span-7 hidden grid-cols-2 gap-2 tab:grid">
          {gallery.map((img, i) => {
            const cell = galleryCell(i, gallery.length);
            return (
              <div key={`${img.url}-${i}`} className={`relative overflow-hidden bg-cream-deep ${cell.span} ${cell.ratio}`}>
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  priority={i < 2}
                  sizes={cell.span === "col-span-2" ? "58vw" : "29vw"}
                  className="object-cover object-top"
                />
                <EnlargeButton onClick={() => setViewerIndex(i)} />
              </div>
            );
          })}
        </div>

        {/* Purchase panel. */}
        <div className="col-span-12 flex flex-col pt-7 tab:sticky tab:top-[132px] tab:col-start-8 tab:col-span-5 tab:pl-8 tab:pt-0 desk:pl-10 hdr:top-[88px]">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-[clamp(24px,2vw,30px)] font-light leading-[1.15] tracking-[-0.01em]">
              {product.title}
            </h1>
            <WishlistButton
              productId={product.id}
              iconSize={21}
              className="-mr-2.5 -mt-2 flex h-11 w-11 flex-none items-center justify-center text-ink"
            />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2.5 text-base">
            <span className={onSale ? "text-sale" : ""}>{formatPrice(price)}</span>
            {onSale && <span className="text-body-sm text-text-4 line-through">{formatPrice(product.price)}</span>}
          </div>
          <span className="mt-3.5 text-[10.5px] tracking-[0.04em] text-text-5">
            Ref. {variant?.sku ?? String(product.id).padStart(6, "0")}
          </span>

          {swatches.length > 0 && (
            <div className="mt-9 flex flex-col gap-3.5">
              <span className="text-card">
                <span className="text-text-3">Renk</span>  {colorName}
              </span>
              <div className="-ml-2 flex gap-1.5">
                {swatches.map((s) => (
                  <button
                    key={s.colorId}
                    type="button"
                    onClick={() => pickColor(s.colorId)}
                    aria-label={s.name}
                    aria-pressed={s.colorId === colorId}
                    title={s.name}
                    className="flex h-9 w-9 items-center justify-center"
                  >
                    <span
                      className={`h-[18px] w-[18px] rounded-full border border-ink/20 transition-shadow ${
                        s.colorId === colorId ? SWATCH_RING : ""
                      }`}
                      style={{ background: s.hex }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={sizeRef} className="mt-7 flex flex-col gap-3">
            {hasSizes && (
              <>
                <div className="flex items-baseline justify-between text-card">
                  <span className="text-text-3">Beden</span>
                  {extras.sizeChart && (
                    <button type="button" onClick={() => setGuideOpen(true)} className={QUIET_LINK}>
                      Beden rehberi
                    </button>
                  )}
                </div>
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 5)}, minmax(0, 1fr))` }}
                >
                  {options.map((o) => {
                    const isSel = o.label === size;
                    return (
                      <button
                        key={o.label}
                        type="button"
                        disabled={!o.available}
                        onClick={() => {
                          setSize(o.label);
                          setSizeError(false);
                        }}
                        aria-pressed={isSel}
                        aria-label={o.available ? `${o.label} beden` : `${o.label} beden, tükendi`}
                        className={`h-12 border text-[13px] transition-colors disabled:border-line disabled:text-disabled disabled:line-through ${
                          isSel
                            ? "border-ink font-medium"
                            : sizeError
                              ? "border-sale/60 hover:border-ink"
                              : "border-line-strong hover:border-ink"
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <span aria-live="polite" className="min-h-[18px] text-nav text-text-4">
              {statusLine}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={soldOut}
            className="mt-2 flex h-[54px] items-center justify-center bg-ink text-nav uppercase tracking-[0.16em] text-background transition-colors hover:bg-ink-hover disabled:bg-disabled"
          >
            {addLabel}
          </button>
          {soldOut && (
            <div className="mt-2">
              <NotifyMeButton />
            </div>
          )}

          <div className="mt-7 flex flex-col gap-2.5 text-card text-ink-soft">
            <span className="flex items-center gap-3">
              <TruckIcon size={17} className="flex-none text-text-3" />
              {formatPrice(FREE_SHIPPING_THRESHOLD)} üzeri siparişlerde ücretsiz kargo. 1-5 iş gününde teslim.
            </span>
            <span className="flex items-center gap-3">
              <ArrowUUpLeftIcon size={17} className="flex-none text-text-3" />
              14 gün içinde kolay iade.
            </span>
            <span className="flex items-center gap-3">
              <LockSimpleIcon size={17} className="flex-none text-text-3" />
              iyzico ile güvenli ödeme.
            </span>
          </div>

          <div className="mt-10 border-t border-line">
            {accordions.map((a) => {
              const isOpen = openAcc.has(a.key);
              return (
                <div key={a.key} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => toggleAcc(a.key)}
                    aria-expanded={isOpen}
                    className="flex h-[54px] w-full items-center justify-between text-nav uppercase tracking-cta"
                  >
                    {a.title}
                    {isOpen ? <MinusIcon size={13} /> : <PlusIcon size={13} />}
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-2 pb-[22px] text-[13px] font-light leading-[1.7] text-ink-soft">
                      {a.body}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mobile: fixed bottom bar with wishlist + add to bag. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-background px-5 py-2.5 tab:hidden">
        <WishlistButton
          productId={product.id}
          className="flex h-[52px] w-[52px] flex-none items-center justify-center border border-line-strong text-ink"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={soldOut}
          className="h-[52px] flex-1 bg-ink text-nav uppercase tracking-[0.14em] text-background disabled:bg-disabled"
        >
          {soldOut ? "Tükendi" : added ? "Sepete eklendi" : `Sepete ekle ${formatPrice(price)}`}
        </button>
      </div>

      {viewerIndex !== null && (
        <ImageViewer
          images={gallery}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {extras.sizeChart && (
        <Drawer open={guideOpen} onClose={() => setGuideOpen(false)} title="Beden rehberi">
          <p className="pb-6 pt-7 text-[13px] font-light leading-[1.7] text-ink-soft">
            Vücut ölçüleri, {extras.sizeChart.unit} cinsinden. İki beden arasında kalıyorsan küçük
            olanı seç.
          </p>
          <SizeChartTable chart={extras.sizeChart} />
        </Drawer>
      )}
    </>
  );
}

function EnlargeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Görseli büyüt"
      className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center bg-background/85 text-ink"
    >
      <ArrowsOutSimpleIcon />
    </button>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductImageSummary } from "@/lib/products";

export function ProductGallery({
  images,
  thumbnail,
  title,
  selectedColorId,
}: {
  images: ProductImageSummary[];
  thumbnail: string;
  title: string;
  selectedColorId: string | null;
}) {
  const colorImages = selectedColorId ? images.filter((img) => img.colorId === selectedColorId) : [];
  // A color with no photos of its own falls back to the full gallery rather
  // than showing nothing — never a broken/empty image slot.
  const displayImages =
    colorImages.length > 0
      ? colorImages
      : images.length > 0
        ? images
        : [{ url: thumbnail, colorId: null, altText: null }];

  const [activeIndex, setActiveIndex] = useState(0);
  // Reset to the first photo whenever the selected color changes — done
  // during render (React's documented pattern for this) rather than in an
  // effect, so there's no extra render pass showing the stale index first.
  const [lastColorId, setLastColorId] = useState(selectedColorId);
  if (selectedColorId !== lastColorId) {
    setLastColorId(selectedColorId);
    setActiveIndex(0);
  }

  const active = displayImages[Math.min(activeIndex, displayImages.length - 1)];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden bg-cream-deep">
        <Image
          src={active.url}
          alt={active.altText ?? title}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          // Top-anchored: product shots are portrait model photos, and a
          // centered square crop cuts off the model's head.
          className="object-cover object-top"
          priority
        />
      </div>
      {displayImages.length > 1 && (
        <div className="mt-3 flex gap-2">
          {displayImages.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              onClick={() => setActiveIndex(i)}
              aria-label={`${i + 1}. görsel`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden border transition ${
                i === activeIndex ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

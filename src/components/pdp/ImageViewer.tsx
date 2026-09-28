"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "@/components/icons/Ph";

type ViewerImage = { url: string; alt: string };

// Design handoff → fullscreen viewer: thumbnail column, 2:3 image, arrows,
// "n / N" counter. Esc / ← / → from the keyboard; a click toggles a 2.2×
// zoom that pans with the cursor.
export function ImageViewer({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: ViewerImage[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const count = images.length;
  const go = (d: number) => {
    setZoomed(false);
    onIndexChange((index + d + count) % count);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && count > 1) go(-1);
      if (e.key === "ArrowRight" && count > 1) go(1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = overflow;
    };
  });

  const current = images[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Görsel görüntüleyici"
      className="fixed inset-0 z-50 flex bg-background"
    >
      {count > 1 && (
        <div className="no-scrollbar hidden w-24 flex-none flex-col gap-2 overflow-y-auto p-4 tab:flex">
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => {
                setZoomed(false);
                onIndexChange(i);
              }}
              aria-label={`${i + 1}. görsel`}
              aria-current={i === index}
              className={`relative aspect-[2/3] w-full flex-none bg-cream-deep transition-opacity ${
                i === index ? "opacity-100 outline outline-1 outline-ink" : "opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <button
          type="button"
          onClick={() => setZoomed((z) => !z)}
          onMouseMove={(e) => {
            if (!zoomed) return;
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          }}
          aria-label={zoomed ? "Uzaklaştır" : "Yakınlaştır"}
          className={`relative aspect-[2/3] h-[min(100dvh-80px,(100vw-40px)*1.5)] overflow-hidden bg-cream-deep ${
            zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
          }`}
        >
          <Image
            src={current.url}
            alt={current.alt}
            fill
            sizes="(max-width: 759px) 100vw, 60vw"
            className="object-cover transition-transform duration-300"
            style={{ transform: zoomed ? "scale(2.2)" : "scale(1)", transformOrigin: origin }}
          />
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Önceki görsel"
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-ink tab:left-6"
            >
              <ArrowLeftIcon size={20} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Sonraki görsel"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-ink tab:right-6"
            >
              <ArrowRightIcon size={20} />
            </button>
          </>
        )}

        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-nav tracking-label text-text-3">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center text-ink tab:right-4 tab:top-4"
        >
          <XIcon size={20} />
        </button>
      </div>
    </div>
  );
}

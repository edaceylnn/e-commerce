"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type ShopRow = {
  href: string;
  label: string;
  count: number;
  image: string;
  imagePosition?: string;
};

// Design handoff → "Shop by category": a large light-weight list in columns
// 1–5; the hovered row darkens, indents 12px and reveals its count while the
// 5:6 image in columns 7–12 crossfades to match.
export function ShopByCategory({ rows }: { rows: ShopRow[] }) {
  const [active, setActive] = useState(0);

  return (
    <section className="page-x pt-40">
      <div className="grid grid-cols-12 items-center gap-2">
        <div className="col-span-12 flex flex-col tab:col-span-6 desk:col-span-5">
          <h2 className="mb-8 text-body-sm uppercase tracking-eyebrow">Kategoriye Göre Alışveriş</h2>
          <div className="flex flex-col">
            {rows.map((row, i) => {
              const on = i === active;
              return (
                <Link
                  key={row.href}
                  href={row.href}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className={`flex items-baseline justify-between py-2.5 transition-[color,padding] duration-500 ease-soft ${
                    on ? "pl-3 text-ink" : "pl-0 text-text-5"
                  }`}
                >
                  <span className="text-[clamp(26px,2.4vw,36px)] font-light leading-[1.15] tracking-title">
                    {row.label}
                  </span>
                  <span
                    className={`text-nav text-text-3 transition-opacity duration-300 ${on ? "opacity-100" : "opacity-0"}`}
                  >
                    {row.count} ürün
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="relative col-span-12 mt-10 aspect-[5/6] overflow-hidden bg-cream-deep tab:col-start-7 tab:col-end-13 tab:mt-0">
          {rows.map((row, i) => (
            <div
              key={row.href}
              aria-hidden={i !== active}
              className={`absolute inset-0 transition-opacity duration-700 ${i === active ? "opacity-100" : "opacity-0"}`}
            >
              <Image
                src={row.image}
                alt=""
                fill
                sizes="(max-width: 759px) 100vw, 50vw"
                className="object-cover"
                style={{ objectPosition: row.imagePosition }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

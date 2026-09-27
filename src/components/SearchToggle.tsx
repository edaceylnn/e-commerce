"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/icons/SearchIcon";

export function SearchToggle() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className="relative flex items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = inputRef.current?.value.trim();
          setOpen(false);
          router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
        }}
        className={`overflow-hidden transition-all duration-300 ease-out ${
          open ? "w-40 opacity-100 sm:w-56" : "w-0 opacity-0"
        }`}
      >
        <input
          ref={inputRef}
          type="search"
          placeholder="Ürün ara..."
          onBlur={() => setOpen(false)}
          className="w-full rounded-full border border-line bg-ivory px-4 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-primary focus:outline-none"
        />
      </form>
      <button
        type="button"
        aria-label="Ara"
        onMouseDown={(e) => {
          if (open) e.preventDefault();
          setOpen((v) => !v);
        }}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-cream-deep ${open ? "ml-2" : ""}`}
      >
        <SearchIcon />
      </button>
    </div>
  );
}

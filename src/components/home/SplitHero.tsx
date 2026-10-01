import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeroVideo } from "@/components/home/HeroVideo";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

// Two halves of one shoot: the same model in a wide, black-and-white film on
// the left and a close colour photo on the right — motion against stillness,
// distance against closeness. On phones only the photo half is shown.
// The header sits transparent on top of it (see Navbar), so it fills the
// screen below the announcement bar.
//
// Film and photo: Los Muertos Crew on Pexels (video 10042938, photo
// 10042928), Pexels licence — free to use and edit, no attribution
// required. The film is trimmed to one shot, cropped to portrait and made
// black and white; the photo is cropped to portrait.
export function SplitHero() {
  return (
    <section className="relative grid h-[calc(100dvh-32px)] min-h-[620px] overflow-hidden bg-[#a29786] tab:grid-cols-2">
      <div className="relative hidden tab:block">
        <HeroVideo src="/hero/disarida.mp4" poster="/hero/disarida.jpg" />
        <div className="pointer-events-none absolute inset-0 bg-ink/[.08]" />
      </div>

      <div className="relative">
        <Image
          src="/hero/hareket.webp"
          alt="Kumsalda matarasından su içen, lila spor takımlı kadın"
          fill
          sizes="(min-width: 760px) 50vw, 100vw"
          priority
          className="animate-hero-settle object-cover object-[50%_30%]"
        />
        <div className="pointer-events-none absolute inset-0 bg-ink/[.18]" />
        <div className="absolute inset-x-0 bottom-12 px-5 text-on-image tab:bottom-14 tab:px-10">
          <span className="animate-hero-rise block text-caption uppercase tracking-eyebrow" style={delay(150)}>
            Yeni sezon — Spor
          </span>
          <h1
            className="animate-hero-rise mt-4 text-[clamp(2.75rem,4.6vw,5.25rem)] font-light leading-[0.95] tracking-[-0.03em]"
            style={delay(300)}
          >
            Hareket et,
            <br />
            rahat kal
          </h1>
          <p className="animate-hero-rise mt-5 max-w-[44ch] text-body font-light" style={delay(450)}>
            Nefes alan kumaşlar; antrenmandan gün sonuna.
          </p>
          <div className="animate-hero-rise mt-7 flex flex-wrap items-center gap-x-8 gap-y-4" style={delay(600)}>
            <Link
              href="/products?category=spor"
              className="inline-flex h-[52px] items-center bg-on-image px-9 text-nav uppercase tracking-[0.16em] text-ink transition-colors duration-300 hover:bg-background"
            >
              Spor koleksiyonu
            </Link>
            <Link href="/products?filter=new" className="text-cta">
              Yeni gelenler
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

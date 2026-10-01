"use client";

import { useEffect, useState } from "react";

// The hero's film half. Only mounted from tablet width up — on phones the
// hero is the photo alone, and a hidden <video> would still download — and
// never for visitors who asked for reduced motion: they get the still.
export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 760px)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPlay(wide.matches && !calm.matches);
    update();
    wide.addEventListener("change", update);
    calm.addEventListener("change", update);
    return () => {
      wide.removeEventListener("change", update);
      calm.removeEventListener("change", update);
    };
  }, []);

  return play ? (
    <video
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden
      className="absolute inset-0 h-full w-full object-cover"
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- a plain still under the film; next/image adds nothing here
    <img src={poster} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
  );
}

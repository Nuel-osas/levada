"use client";

import { useEffect } from "react";

/** Section entrances: fade and rise 12px as each block scrolls in (skipped under reduced motion). */
export function Reveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>(".reveal")];
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}

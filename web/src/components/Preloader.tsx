"use client";

import { useEffect, useState } from "react";
import { Mark } from "./Lockup";

/**
 * A short intro: the mark and a 0–100 counter, then the curtain lifts and the hero lines rise.
 * Once per session; skipped under reduced motion. Sets `is-loaded` on <html> when done, which
 * starts the hero's entrance (CSS). Without JavaScript the page shows as is.
 */
export function Preloader() {
  const [n, setN] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    let seen = false;
    try {
      seen = sessionStorage.getItem("levada-intro") === "1";
      sessionStorage.setItem("levada-intro", "1");
    } catch {}
    if (seen || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGone(true);
      root.classList.add("is-loaded");
      return;
    }
    const start = performance.now();
    const dur = 1500;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        root.classList.add("is-loaded");
        setTimeout(() => setGone(true), 1100);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (gone) return null;
  return (
    <div className="loader" aria-hidden="true">
      <div className="loader__in">
        <Mark size={56} />
        <span className="loader__count">{String(n).padStart(3, "0")}</span>
      </div>
      <p className="loader__line">Mezo&apos;s savings rate, now on Base</p>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Token, type TokenName } from "./Token";

const WORDS: [string, TokenName | null][] = [
  ["MUSD", "musd"],
  ["sMUSD", "smusd"],
  ["lsMUSD", "lsmusd"],
  ["Bitcoin-backed yield", "btc"],
  ["One deposit", null],
  ["Base", "base"],
  ["Mezo", "mezo"],
];

/** A giant running line. It drifts on its own, speeds up with scrolling and turns with its direction. */
export function Marquee() {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let x = 0, dir = -1, boost = 0, last = scrollY, raf = 0;
    const onScroll = () => {
      const d = scrollY - last;
      last = scrollY;
      if (d !== 0) dir = d > 0 ? -1 : 1;
      boost = Math.min(18, boost + Math.abs(d) * 0.08);
    };
    const tick = () => {
      const half = el.scrollWidth / 2;
      x += dir * (0.6 + boost);
      boost *= 0.92;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      el.style.transform = `translate3d(${x}px, 0, 0)`;
      raf = requestAnimationFrame(tick);
    };
    addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", onScroll);
    };
  }, []);

  const row = (copy: boolean) => (
    <div className="marquee__row" aria-hidden={copy || undefined}>
      {WORDS.map(([w, t], i) => (
        <span key={w} className={i % 2 ? "marquee__w marquee__w--serif" : "marquee__w"}>
          {t && <Token name={t} size="0.62em" className="marquee__tok" />}
          {w}
          <span className="marquee__star" aria-hidden="true">
            ✺
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="marquee" role="presentation">
      <div className="marquee__track" ref={track}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { BRAND } from "@/lib/config";

const PARTS = [
  {
    n: "01",
    role: "The asset",
    name: "MUSD",
    body: "Mezo's Bitcoin-backed stablecoin. You deposit it on Base; the hub stakes it on Mezo.",
    tone: "warm",
  },
  {
    n: "02",
    role: "The bridge",
    name: "Wormhole NTT",
    body: "MUSD's own bridge between Base and Mezo. 13 of 19 guardians sign every transfer. Levada adds no new bridge trust.",
    tone: "ink",
  },
  {
    n: "03",
    role: "The yield",
    name: "sMUSD",
    body: "Mezo's MUSD Savings Rate, paid by interest on Bitcoin-backed loans. Every Levada deposit is new sMUSD demand.",
    tone: "mint",
  },
  {
    n: "04",
    role: "The output",
    name: BRAND.token,
    body: "A standard ERC-4626 token on Base. Ready to be collateral in lending markets, a leg in DEX pools, a block in other vaults.",
    tone: "cool",
  },
] as const;

/**
 * "Built on Mezo" as a horizontal ride: the section pins while vertical scrolling slides the four
 * building blocks past, in the order money moves. Under 900px wide (or reduced motion) it is a
 * plain vertical list.
 */
export function Stack() {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const o = outer.current;
    const t = track.current;
    if (!o || !t) return;
    const mq = matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    let raf = 0;
    const update = () => {
      raf = 0;
      if (!mq.matches) {
        o.style.height = "";
        t.style.transform = "";
        return;
      }
      const travel = t.scrollWidth - innerWidth;
      o.style.height = `${travel + innerHeight}px`;
      const top = o.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, -top / travel));
      t.style.transform = `translate3d(${-p * travel}px, 0, 0)`;
      o.style.setProperty("--p", String(p));
    };
    const req = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", req, { passive: true });
    addEventListener("resize", req);
    mq.addEventListener("change", req);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", req);
      removeEventListener("resize", req);
      mq.removeEventListener("change", req);
    };
  }, []);

  return (
    <div className="hs" ref={outer}>
      <div className="hs__pin">
        <ol className="hs__track" ref={track}>
          <li className="hs__intro">
            <p className="eyebrow">Built on Mezo</p>
            <h2 id="stack-title" className="h2">
              Made from Mezo&apos;s <em>own</em> parts.
            </h2>
            <p className="hs__lede">
              Levada doesn&apos;t compete with Mezo. It extends the MUSD Savings Rate to every MUSD holder on Base, and
              hands back a token the rest of DeFi can build on.
            </p>
            <p className="hs__hint" aria-hidden="true">
              Scroll <span>→</span>
            </p>
          </li>
          {PARTS.map((p) => (
            <li key={p.name} className={`hs__card hs__card--${p.tone}`}>
              <div className="hs__top">
                <span className="hs__n">{p.n}</span>
                <span className="hs__role">{p.role}</span>
              </div>
              <h3 className="hs__name">{p.name}</h3>
              <p className="hs__body">{p.body}</p>
              <span className="hs__orb" aria-hidden="true" />
            </li>
          ))}
        </ol>
        <div className="hs__progress" aria-hidden="true">
          <i />
        </div>
      </div>
    </div>
  );
}

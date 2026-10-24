"use client";

import { useEffect, useRef, useState } from "react";
import { links } from "@/lib/config";
import { fmtPct, fmtUsd, fmtUsdShort, fmtUsdSig, utcTime } from "@/lib/format";
import { useApy, useMarket } from "@/lib/hooks";

type Item = { k: string; v: string; tone?: "yield" };

/**
 * A thin ticker of live Mezo mainnet figures under the header: BTC, MUSD (at its real price, not
 * $1), sMUSD's rate and TVL, and MEZO. Prices: DefiLlama coins API. Rate and TVL: DefiLlama yields.
 * A figure that can't be read is left out. When the row is wider than the screen it scrolls as a
 * marquee (paused on hover, and a plain swipeable row under reduced motion).
 */
export function MezoStrip() {
  const apy = useApy();
  const p = useMarket()?.prices;
  const items: Item[] = [];
  if (p?.btc) items.push({ k: "BTC", v: fmtUsd(p.btc.usd, 0) });
  if (p?.musd) items.push({ k: "MUSD", v: fmtUsd(p.musd.usd, 3) });
  if (apy) items.push({ k: "sMUSD rate", v: fmtPct(apy.apy), tone: "yield" });
  if (apy?.tvlUsd) items.push({ k: "sMUSD TVL", v: fmtUsdShort(apy.tvlUsd) });
  if (p?.mezo) items.push({ k: "MEZO", v: fmtUsdSig(p.mezo.usd, 3) });
  const stamps = [p?.btc?.asOf, p?.musd?.asOf, p?.mezo?.asOf].filter((t): t is string => !!t).sort();
  const updated = stamps.at(-1);

  const view = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [loop, setLoop] = useState(false);
  useEffect(() => {
    const v = view.current;
    const l = list.current;
    if (!v || !l) return;
    const check = () => setLoop(l.scrollWidth > v.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(v);
    ro.observe(l);
    return () => ro.disconnect();
  }, []);

  const row = (copy: boolean) => (
    <ul className="strip__list" ref={copy ? undefined : list} aria-hidden={copy || undefined}>
      <li className="strip__tag">
        <span className="live-dot" aria-hidden="true" />
        Mezo mainnet
      </li>
      {items.map((it) => (
        <li key={it.k}>
          <span>{it.k}</span> <b className={it.tone === "yield" ? "t-yield" : undefined}>{it.v}</b>
        </li>
      ))}
      <li className="strip__src">
        via{" "}
        <a href={links.defillama} target="_blank" rel="noreferrer" tabIndex={copy ? -1 : undefined}>
          DefiLlama
        </a>
        {updated && <> · {utcTime(updated)}</>}
      </li>
    </ul>
  );

  return (
    <div className="strip" role="region" aria-label="Mezo mainnet today, via DefiLlama">
      <div className="container">
        <div className={loop ? "strip__view is-loop" : "strip__view"} ref={view}>
          <div className="strip__track">
            {row(false)}
            {loop && row(true)}
          </div>
        </div>
      </div>
    </div>
  );
}

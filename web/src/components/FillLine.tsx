"use client";

import { Fragment, type CSSProperties } from "react";
import { MAINNET } from "@/lib/config";
import { fmt, utcDay, utcTime } from "@/lib/format";
import { useMarket } from "@/lib/hooks";

type Part = { text: string; tone?: "cool" | "yield" };

/**
 * The market in one sentence, with the live MUSD supply on Base mainnet. Each word fills from grey
 * to full colour as the sentence scrolls through the screen (CSS scroll-driven animation; full
 * colour where that isn't supported, and under reduced motion).
 */
export function FillLine() {
  const supply = useMarket()?.baseMusd;
  const parts: Part[] = supply
    ? [
        { text: "About" },
        { text: `${fmt(supply.supply, 0)} MUSD`, tone: "cool" },
        { text: "sits on Base earning close to nothing. Levada pays it" },
      ]
    : [{ text: "MUSD on Base", tone: "cool" }, { text: "sits earning close to nothing. Levada pays it" }];
  parts.push({ text: "Mezo's savings rate,", tone: "yield" }, { text: "from interest on Bitcoin loans." });
  let n = 0;
  const words = parts.flatMap((p) => p.text.split(" ").map((w) => ({ w, tone: p.tone, i: n++ })));

  return (
    <section className="fill-sec" aria-labelledby="fill-line">
      <div className="container">
        <p id="fill-line" className="fill" style={{ "--n": words.length } as CSSProperties}>
          {words.map(({ w, tone, i }) => (
            <Fragment key={i}>
              <span className={tone ? `fill__w is-${tone}` : "fill__w"} style={{ "--i": i } as CSSProperties}>
                {w}
              </span>{" "}
            </Fragment>
          ))}
        </p>
        {supply && (
          <p className="fill__src">
            {supply.stale ? `Last read ${utcDay(supply.asOf)}` : "Live"}: totalSupply() of MUSD{" "}
            <a href={`https://basescan.org/token/${MAINNET.baseMusd}`} target="_blank" rel="noreferrer">
              on Base mainnet ↗
            </a>
            {supply.block ? `, block ${fmt(supply.block, 0)}` : ""}
            {!supply.stale && `, ${utcTime(supply.asOf)}`}
          </p>
        )}
      </div>
    </section>
  );
}

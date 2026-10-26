"use client";

import { LAUNCH } from "@/lib/config";
import { fmt, fmtPct, fmtUsdShort } from "@/lib/format";
import { netRate, useApy, useMarket } from "@/lib/hooks";
import { Token, TokenPair } from "./Token";

/** The hero's live figures: Mezo's rate, what reaches a saver, and the market Levada serves. */
export function HeroStats() {
  const apy = useApy();
  const supply = useMarket()?.baseMusd;
  const net = netRate(apy?.apy, LAUNCH.feeBps, LAUNCH.bufferBps);
  const stats = [
    { k: "sMUSD rate on Mezo", v: fmtPct(apy?.apy), tone: "yield", icon: <Token name="smusd" size={16} /> },
    { k: "To you, after fees", v: fmtPct(net === undefined ? undefined : net * 100), icon: <Token name="lsmusd" size={16} /> },
    { k: "Saved in sMUSD", v: fmtUsdShort(apy?.tvlUsd), icon: <Token name="mezo" size={16} /> },
    { k: "MUSD idle on Base", v: supply ? fmt(supply.supply, 0) : "–", icon: <TokenPair a="musd" b="base" size={16} /> },
  ];
  return (
    <dl className="hstats">
      {stats.map((s) => (
        <div key={s.k} className="hstats__item">
          <dt>
            {s.icon}
            {s.k}
          </dt>
          <dd className={s.tone === "yield" ? "t-yield" : undefined}>{s.v}</dd>
        </div>
      ))}
    </dl>
  );
}

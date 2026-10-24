"use client";

import { BRAND } from "@/lib/config";
import { fmt, fmtMusd, fmtPct } from "@/lib/format";
import { useSavings } from "@/lib/hooks";
import { Odometer } from "./Odometer";

/** The live number, framed by a sentence above and below it. */
export function Balance() {
  const s = useSavings();
  const apy = s.apy?.apy;
  const net = s.rate === undefined ? undefined : s.rate * 100;

  if (s.mode === "mine")
    return (
      <div className="balance">
        <p className="balance__lead">Your savings</p>
        <div className="balance__num">
          <Odometer value={s.mine} label="Your savings, about" className="odo--xl" />
          <span className="balance__unit">MUSD</span>
        </div>
        <p className="balance__tail">
          Live estimate: what the vault values your {fmtMusd(s.vault.shares, 4)} {BRAND.token} at, plus about{" "}
          <b className="t-yield">{fmtPct(net)}</b> a year since. That is Mezo&apos;s {fmtPct(apy)} after the fee and the
          buffer kept on Base.
        </p>
      </div>
    );

  if (s.mode === "earned")
    return (
      <div className="balance">
        <p className="balance__lead">Savers have earned</p>
        <div className="balance__num">
          <Odometer value={s.earned} label="Savers have earned about" className="odo--xl" />
          <span className="balance__unit">MUSD</span>
        </div>
        <p className="balance__tail">
          from Bitcoin borrowers on Mezo. Live estimate, at Mezo&apos;s <b className="t-yield">{fmtPct(apy)}</b> savings
          rate after fees. Connect a wallet to see your own.
        </p>
      </div>
    );

  return (
    <div className="balance">
      <p className="balance__lead">Watch 1,000 MUSD grow</p>
      <div className="balance__num">
        <Odometer value={s.example} label="Example: 1,000 MUSD grows to about" className="odo--xl" />
        <span className="balance__unit">MUSD</span>
      </div>
      <p className="balance__tail">
        An example at Mezo&apos;s savings rate today, <b className="t-yield">{fmtPct(apy)}</b> a year, before fees. Every
        second it ticks by {fmt((10 * (apy ?? 0)) / 31_536_000, 7)} MUSD.
      </p>
    </div>
  );
}

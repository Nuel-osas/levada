"use client";

import { useState, type CSSProperties } from "react";
import { BRAND, DEPLOYED, LAUNCH } from "@/lib/config";
import { fmt, fmtMusd, fmtPct, toNum } from "@/lib/format";
import { netRate, useEstimate, useSavings } from "@/lib/hooks";
import { Odometer } from "./Odometer";
import { Token } from "./Token";

/** Amounts the slider steps through: round numbers, denser at the small end. */
const STOPS = [
  100, 200, 250, 500, 750, 1_000, 1_500, 2_000, 2_500, 3_000, 4_000, 5_000, 7_500, 10_000, 15_000, 20_000, 25_000,
  30_000, 40_000, 50_000,
];
const START = STOPS.indexOf(1_000);
const pct = (bps: bigint) => Number(bps) / 100;

/** The live number, framed by a sentence above and below it, plus a calculator for any amount. */
export function Balance() {
  const s = useSavings();
  const [k, setK] = useState(START);
  const amount = STOPS[k];
  const apy = s.apy?.apy;
  // Before launch these are the deploy settings; once live, the contracts' own.
  const feeBps = s.hub?.feeBps ?? LAUNCH.feeBps;
  const bufferBps = s.vault.bufferBps ?? LAUNCH.bufferBps;
  const net = netRate(apy, feeBps, bufferBps);
  const netPct = net === undefined ? undefined : net * 100;
  const example = useEstimate(amount, amount * (net ?? 0), `example:${amount}`, s.now);

  if (s.mode === "mine")
    return (
      <div className="balance">
        <p className="balance__lead">Your savings</p>
        <div className="balance__num">
          <Odometer value={s.mine} label="Your savings, about" className="odo--xl" />
          <span className="balance__unit">
            <Token name="musd" size={24} /> MUSD
          </span>
        </div>
        <p className="balance__tail">
          Live estimate: what the vault values your {fmtMusd(s.vault.shares, 4)} {BRAND.token} at, plus about{" "}
          <b className="t-yield">{fmtPct(s.rate === undefined ? undefined : s.rate * 100)}</b> a year since. That is
          Mezo&apos;s {fmtPct(apy)} after the fee and the buffer kept on Base.
        </p>
      </div>
    );

  // Exit split: live against the free buffer once deployed; before that, at the buffer target.
  const free = DEPLOYED ? toNum(s.vault.freeIdle) : undefined;
  const instant = free !== undefined ? Math.min(amount, free) : (amount * Number(bufferBps)) / 10_000;
  const queued = Math.max(0, amount - instant);

  const calc = (
    <div className="calc">
      <div className="calc__head">
        <label htmlFor="calc-amount">{s.mode === "example" ? "Example amount" : "Try an amount"}</label>
        <output htmlFor="calc-amount" className="calc__amt">
          {fmt(amount, 0)} MUSD
        </output>
      </div>
      <input
        id="calc-amount"
        className="range"
        type="range"
        min={0}
        max={STOPS.length - 1}
        step={1}
        value={k}
        onChange={(e) => setK(Number(e.target.value))}
        aria-valuetext={`${fmt(amount, 0)} MUSD`}
        style={{ "--p": `${(k / (STOPS.length - 1)) * 100}%` } as CSSProperties}
      />
      <p className="calc__scale" aria-hidden="true">
        <span>{fmt(STOPS[0], 0)}</span>
        <span className="calc__hint">
          <span className="hint-fine">Drag to try another amount</span>
          <span className="hint-touch">Tap and drag to try another amount</span>
        </span>
        <span>{fmt(STOPS.at(-1), 0)}</span>
      </p>
      <dl className="calc__rows">
        <div>
          <dt>
            <span>
              A year at <b className="t-yield">{fmtPct(netPct)}</b>, after fees
            </span>
          </dt>
          <dd className="t-yield">+{fmt(net === undefined ? undefined : amount * net)} MUSD</dd>
        </div>
        <div>
          <dt>
            <Token name="base" size={16} /> Instant on exit, from the Base buffer
          </dt>
          <dd>{fmt(instant, 0)} MUSD</dd>
        </div>
        <div>
          <dt>
            <Token name="wormhole" size={16} /> Queued, paid in order from Mezo
          </dt>
          <dd>{fmt(queued, 0)} MUSD</dd>
        </div>
      </dl>
      <div className="split" aria-hidden="true" style={{ "--w": `${(instant / amount) * 100}%` } as CSSProperties}>
        <i />
        <i />
      </div>
      <p className="calc__note">
        {free !== undefined ? (
          <>
            Live: {fmt(free, 0)} MUSD is free in the Base buffer right now, so exits up to that are instant. The rest
            queues and is usually paid within minutes. Yield is an estimate: Mezo&apos;s rate moves with borrowing.
          </>
        ) : (
          <>
            Estimate. Mezo&apos;s rate moves with borrowing. Instant versus queued assumes the buffer at its{" "}
            {pct(bufferBps)}% target and you as the only saver; with more savers, more of an exit is instant. Queued
            exits are usually paid within minutes.
          </>
        )}
      </p>
    </div>
  );

  if (s.mode === "earned")
    return (
      <div className="balance">
        <p className="balance__lead">Savers have earned</p>
        <div className="balance__num">
          <Odometer value={s.earned} label="Savers have earned about" className="odo--xl" />
          <span className="balance__unit">
            <Token name="musd" size={24} /> MUSD
          </span>
        </div>
        <p className="balance__tail">
          from Bitcoin borrowers on Mezo. Live estimate, at Mezo&apos;s <b className="t-yield">{fmtPct(apy)}</b> savings
          rate after fees. Connect a wallet to see your own.
        </p>
        {calc}
      </div>
    );

  return (
    <div className="balance">
      <p className="balance__lead">Watch {fmt(amount, 0)} MUSD grow</p>
      <div className="balance__num">
        <Odometer value={example} label={`Example: ${fmt(amount, 0)} MUSD grows to about`} className="odo--xl" />
        <span className="balance__unit">
            <Token name="musd" size={24} /> MUSD
          </span>
      </div>
      <p className="balance__tail">
        An example at Mezo&apos;s savings rate today, {fmtPct(apy)} a year: about{" "}
        <b className="t-yield">{fmtPct(netPct)}</b> after Levada&apos;s {pct(feeBps)}% fee on yield and the{" "}
        {pct(bufferBps)}% kept on Base for instant exits. Every second it ticks by{" "}
        {fmt((amount * (net ?? 0)) / 31_536_000, 7)} MUSD.
      </p>
      {calc}
    </div>
  );
}

"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useBlockNumber } from "wagmi";
import { DEPLOYED, baseChain, chainNames } from "@/lib/config";
import { ago, fmt, fmtPct, fmtShort, fmtSpan, fmtUsdShort, toNum, utcDay } from "@/lib/format";
import { useFaucetReady } from "@/lib/faucet";
import { useApy, useMarket, useSavings } from "@/lib/hooks";
import { Odometer } from "./Odometer";
import { Token, type TokenName } from "./Token";

const SW: Record<string, TokenName> = { ember: "mezo", aqua: "wormhole", tide: "base", gold: "smusd" };

/** The keeper's GitHub Actions schedule (.github/workflows/keeper.yml): every 5 minutes, best effort. */
const KEEPER_EVERY = 300;

/**
 * Where the money is, as four numbered stations in the same left-to-right order as the scene:
 * Mezo island, the aqueduct, the Base island, and the yield the coins carry home.
 * The lit station follows the coins in the hero. Before the vault is live the stations show the
 * market it serves, read live from Mezo mainnet; after, the vault's own figures.
 */
export function Flow() {
  return DEPLOYED ? <VaultStations /> : <MainnetStations />;
}

function MainnetStations() {
  const apy = useApy();
  const supply = useMarket()?.baseMusd;
  const faucet = useFaucetReady();
  const when = (iso: string | undefined, stale?: boolean) => (stale && iso ? ` · as of ${utcDay(iso)}` : "");

  return (
    <section className="flow" aria-labelledby="flow-title">
      <div className="container">
        <div className="flow__head">
          <h2 id="flow-title" className="eyebrow">
            Mezo mainnet today
          </h2>
          <p className="ticker" aria-live="off">
            <span className="live-dot" aria-hidden="true" />
            <span>Live</span>
            <span>sMUSD via DefiLlama</span>
            <span>MUSD supply via Base RPC</span>
            <span>Levada runs on {chainNames.base}</span>
            <span>
              <Link href="/status">Status ↗</Link>
            </span>
          </p>
        </div>

        <ol className="stations">
          <li className="station" data-n={1}>
            <span className="station__idx">01</span>
            <span className="station__label">
              <Token name="mezo" size={18} />
              Saved in sMUSD
            </span>
            <span className="station__value">{fmtUsdShort(apy?.tvlUsd)}</span>
            <span className="station__cap">on Mezo, by all savers{when(apy?.asOf, apy?.stale)}</span>
          </li>
          <li className="station" data-n={2}>
            <span className="station__idx">02</span>
            <span className="station__label">
              <Token name="wormhole" size={18} />
              Levada vault
            </span>
            <span className="station__value station__value--status">
              <span className="live-dot live-dot--soon" aria-hidden="true" />
              Opens soon
            </span>
            <span className="station__cap">
              on {chainNames.base}, hub on {chainNames.mezo}.{" "}
              {faucet ? <a href="#save">Try it with test MUSD ↓</a> : <a href="#how">See how it works ↓</a>}
            </span>
          </li>
          <li className="station" data-n={3}>
            <span className="station__idx">03</span>
            <span className="station__label">
              <Token name="base" size={18} />
              MUSD on Base
            </span>
            <span className="station__value">
              {fmt(supply?.supply, 0)}
              <span className="station__unit">MUSD</span>
            </span>
            <span className="station__cap">the market Levada serves{when(supply?.asOf, supply?.stale)}</span>
          </li>
          <li className="station" data-n={4}>
            <span className="station__idx">04</span>
            <span className="station__label">
              <Token name="smusd" size={18} />
              sMUSD savings rate
            </span>
            <span className="station__value t-yield">{fmtPct(apy?.apy)}</span>
            <span className="station__cap">
              {apy?.avg30d !== undefined
                ? `variable: ${fmtPct(apy.avg30d)} on average over 30 days`
                : "variable, paid by Bitcoin borrowers"}
              {when(apy?.asOf, apy?.stale)}
            </span>
          </li>
        </ol>
      </div>
    </section>
  );
}

function VaultStations() {
  const s = useSavings();
  const { flows, vault, apy, now } = s;
  const block = useBlockNumber({ chainId: baseChain.id, watch: true, query: { refetchInterval: 6_000 } });
  const unlocking = toNum(flows?.unlocking) ?? 0;
  const nowSec = now ? Math.floor(now / 1000) : 0;

  // The last report's gain is released linearly over PROFIT_UNLOCK (12 h) from lockedProfitAt.
  const span = Number(vault.profitUnlock ?? 43_200n);
  const since = vault.lockedProfitAt !== undefined && nowSec ? nowSec - Number(vault.lockedProfitAt) : undefined;
  const gain = toNum(vault.lockedAtReport) ?? 0;
  const releasing = since !== undefined && gain > 0 && since < span;
  const released = since === undefined ? 0 : Math.min(1, Math.max(0, since / span));

  const reported = vault.hasReport && vault.lastReport ? ago(vault.lastReport[3], now || undefined) : undefined;
  const nextPass = nowSec ? KEEPER_EVERY - (nowSec % KEEPER_EVERY) : undefined;

  const stations = [
    {
      n: 1,
      sw: "ember",
      label: "Earning on Mezo",
      value: toNum(flows?.onMezo),
      cap: `in sMUSD at ${fmtPct(apy?.apy)} a year${apy?.tvlUsd ? `, among ${fmtUsdShort(apy.tvlUsd)} saved on Mezo` : ""}`,
    },
    { n: 2, sw: "aqua", label: "Crossing the bridge", value: toNum(flows?.crossing), cap: "on Wormhole NTT, both ways" },
    { n: 3, sw: "tide", label: "Buffer on Base", value: toNum(flows?.buffer), cap: "ready for instant exits" },
  ] as const;

  return (
    <section className="flow" aria-labelledby="flow-title">
      <div className="container">
        <div className="flow__head">
          <h2 id="flow-title" className="eyebrow">
            Where the money is
          </h2>
          <p className="ticker" aria-live="off">
            <span className="live-dot" aria-hidden="true" />
            <span>Live</span>
            <span>
              {chainNames.base} block {block.data ? fmt(Number(block.data), 0) : "…"}
            </span>
            <span>Report from Mezo {reported ?? "pending"}</span>
            {nextPass !== undefined && <span>Next keeper pass in about {fmtSpan(nextPass)}</span>}
            {!!vault.bridgeable && vault.bridgeable > 0n && <span>Next crossing {fmtShort(toNum(vault.bridgeable))} MUSD</span>}
            <span>
              <Link href="/status">Status ↗</Link>
            </span>
          </p>
        </div>

        <ol className="stations">
          {stations.map((st) => (
            <li key={st.n} className="station" data-n={st.n}>
              <span className="station__idx">0{st.n}</span>
              <span className="station__label">
                <Token name={SW[st.sw]} size={18} />
                {st.label}
              </span>
              <span className={st.value === undefined ? "station__value is-empty" : "station__value"}>
                {fmt(st.value ?? 0)}
                <span className="station__unit">MUSD</span>
              </span>
              <span className="station__cap">{st.cap}</span>
            </li>
          ))}
          <li className="station" data-n={4}>
            <span className="station__idx">04</span>
            <span className="station__label">
              <Token name="smusd" size={18} />
              Yield earned
            </span>
            <span className="station__value">
              <Odometer value={s.earned} label="Yield earned, about" className="odo--station" />
              <span className="station__unit">MUSD</span>
            </span>
            {releasing ? (
              <span className="station__cap">
                <span className="unlock" style={{ "--p": `${released * 100}%` } as CSSProperties} aria-hidden="true">
                  <i />
                </span>
                {Math.floor(released * 100)}% of the last +{fmtShort(gain)} MUSD released · {fmtSpan(span - (since ?? 0))} left
                {unlocking > 0 && <span className="sr-only"> ({fmtShort(unlocking)} MUSD still unlocking)</span>}
              </span>
            ) : (
              <span className="station__cap">paid by Bitcoin borrowers, released over {span / 3600} h</span>
            )}
          </li>
        </ol>
      </div>
    </section>
  );
}

"use client";

import { useBlockNumber } from "wagmi";
import { DEPLOYED, baseChain, chainNames } from "@/lib/config";
import { ago, fmt, fmtPct, fmtShort, toNum } from "@/lib/format";
import { useSavings } from "@/lib/hooks";
import { Odometer } from "./Odometer";
import { focusStage } from "./SceneHud";

/**
 * Where the money is, as four numbered stations in the same left-to-right order as the scene:
 * Mezo island, the aqueduct, the Base island, and the yield the coins carry home.
 * The lit station follows the coins in the hero.
 */
export function Flow() {
  const s = useSavings();
  const { flows, vault, apy, now } = s;
  const block = useBlockNumber({ chainId: baseChain.id, watch: true, query: { refetchInterval: 6_000 } });
  const unlocking = toNum(flows?.unlocking) ?? 0;

  const stations = [
    { n: 1, sw: "ember", label: "Earning on Mezo", value: toNum(flows?.onMezo), cap: `in sMUSD at ${fmtPct(apy?.apy)} a year` },
    {
      n: 2,
      sw: "aqua",
      label: "Crossing the bridge",
      value: toNum(flows?.crossing),
      cap: "on Wormhole NTT, both ways",
    },
    { n: 3, sw: "tide", label: "Buffer on Base", value: toNum(flows?.buffer), cap: "ready for instant exits" },
  ] as const;

  const reported = vault.hasReport && vault.lastReport ? ago(vault.lastReport[3], now || undefined) : undefined;

  return (
    <section className="flow" aria-labelledby="flow-title">
      <div className="container">
        <div className="flow__head">
          <h2 id="flow-title" className="eyebrow">
            Where the money is
          </h2>
          <p className="ticker" aria-live="off">
            <span className={DEPLOYED ? "live-dot" : "live-dot live-dot--soon"} aria-hidden="true" />
            <span>{DEPLOYED ? "Live" : "Testnet"}</span>
            {!DEPLOYED && <span>Vault opens soon</span>}
            <span>
              {chainNames.base} block {block.data ? fmt(Number(block.data), 0) : "…"}
            </span>
            {DEPLOYED && <span>Last report from Mezo {reported ?? "pending"}</span>}
            {DEPLOYED && !!vault.bridgeable && vault.bridgeable > 0n && (
              <span>Next crossing {fmtShort(toNum(vault.bridgeable))} MUSD</span>
            )}
            <span>Mezo rate {fmtPct(apy?.apy)} via DefiLlama</span>
          </p>
        </div>

        <ol className="stations" onMouseLeave={() => focusStage(0)}>
          {stations.map((st) => (
            <li key={st.n} className="station" data-n={st.n} onMouseEnter={() => focusStage(st.n)}>
              <span className="station__idx">0{st.n}</span>
              <span className="station__label">
                <i className={`sw sw--${st.sw}`} aria-hidden="true" />
                {st.label}
              </span>
              <span className={st.value === undefined ? "station__value is-empty" : "station__value"}>
                {fmt(st.value ?? 0)}
                <span className="station__unit">MUSD</span>
              </span>
              <span className="station__cap">{DEPLOYED ? st.cap : st.n === 1 ? st.cap : "opens with the vault"}</span>
            </li>
          ))}
          <li className="station" data-n={4} onMouseEnter={() => focusStage(4)}>
            <span className="station__idx">04</span>
            <span className="station__label">
              <i className="sw sw--gold" aria-hidden="true" />
              Yield earned
            </span>
            <span className={DEPLOYED ? "station__value" : "station__value is-empty"}>
              <Odometer value={DEPLOYED ? s.earned : 0} label="Yield earned, about" className="odo--station" />
              <span className="station__unit">MUSD</span>
            </span>
            <span className="station__cap">
              {DEPLOYED
                ? unlocking > 0
                  ? `${fmtShort(unlocking)} MUSD still unlocking (${Number(vault.profitUnlock ?? 43_200n) / 3600} h)`
                  : "paid by Bitcoin borrowers"
                : "paid by Bitcoin borrowers"}
            </span>
          </li>
        </ol>
      </div>
    </section>
  );
}

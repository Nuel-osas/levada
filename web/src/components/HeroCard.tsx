"use client";

import { BRAND, LAUNCH } from "@/lib/config";
import { fmtPct, fmtUsdShort } from "@/lib/format";
import { netRate, useApy } from "@/lib/hooks";
import { Icon } from "./Icon";

/** The hero's right side: today's rate, the route MUSD takes, and the three promises. */
export function HeroCard() {
  const apy = useApy();
  const net = netRate(apy?.apy, LAUNCH.feeBps, LAUNCH.bufferBps);
  return (
    <div className="hcard" aria-label="Today's rate and how Levada routes your MUSD">
      <div className="hcard__glow" aria-hidden="true" />
      <div className="hcard__panel">
        <div className="hcard__rate">
          <p className="hcard__label">sMUSD savings rate on Mezo</p>
          <p className="hcard__num">{fmtPct(apy?.apy)}</p>
          <p className="hcard__sub">
            ≈ <b>{fmtPct(net === undefined ? undefined : net * 100)}</b> to you after fees
            {apy?.tvlUsd ? ` · ${fmtUsdShort(apy.tvlUsd)} saved on Mezo` : ""}
          </p>
        </div>

        <ol className="route" aria-label="Route">
          <li className="route__node route__node--cool">
            <span className="route__chain">Base</span>
            <span className="route__asset">MUSD → {BRAND.token}</span>
          </li>
          <li className="route__link" aria-hidden="true">
            <span className="route__line" />
            <span className="route__tag">Wormhole NTT</span>
          </li>
          <li className="route__node route__node--warm">
            <span className="route__chain">Mezo</span>
            <span className="route__asset">sMUSD</span>
          </li>
        </ol>

        <ul className="hcard__checks">
          {["No bridging by hand", "No BTC for gas", "Withdraw any time"].map((t) => (
            <li key={t}>
              <span className="hcard__tick" aria-hidden="true">
                <Icon name="review" size={14} />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

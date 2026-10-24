"use client";

import { NETWORK, links } from "@/lib/config";
import { fmtPct, fmtUsdShort, utcDay } from "@/lib/format";
import { useApy } from "@/lib/hooks";

/** The rate, inline in the headline, as a yield sticker. */
export function RateChip() {
  const apy = useApy();
  return (
    <span className="rate-chip" title="Mezo's sMUSD savings rate on Mezo mainnet, via DefiLlama">
      {fmtPct(apy?.apy)}
    </span>
  );
}

/** Where the headline number comes from, in one line, labelled as Mezo mainnet (the app itself runs on testnet). */
export function RateSource() {
  const apy = useApy();
  return (
    <>
      <b>Mezo mainnet {apy?.stale ? `on ${utcDay(apy.asOf)}` : "today"}:</b> sMUSD pays {fmtPct(apy?.apy)} a year
      {apy?.tvlUsd ? ` on ${fmtUsdShort(apy.tvlUsd)} saved` : ""}, via{" "}
      <a href={links.defillama} target="_blank" rel="noreferrer">
        DefiLlama
      </a>
      .{NETWORK === "testnet" && " Levada runs on testnet: test MUSD has no value."}
    </>
  );
}

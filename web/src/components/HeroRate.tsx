"use client";

import { NETWORK, links } from "@/lib/config";
import { fmtPct } from "@/lib/format";
import { useApy } from "@/lib/hooks";

/** The rate, inline in the headline, as a yield sticker. */
export function RateChip() {
  const apy = useApy();
  return (
    <span className="rate-chip" title="Mezo's sMUSD savings rate, via DefiLlama">
      {fmtPct(apy?.apy)}
    </span>
  );
}

/** Where the headline number comes from, in one line. */
export function RateSource() {
  const apy = useApy();
  const when = apy?.stale
    ? `on ${new Date(apy.asOf).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`
    : "today";
  return (
    <>
      {fmtPct(apy?.apy)} a year is Mezo&apos;s sMUSD savings rate {when}, via{" "}
      <a href={links.defillama} target="_blank" rel="noreferrer">
        DefiLlama
      </a>
      .{NETWORK === "testnet" && " Levada runs on testnet: test MUSD has no value."}
    </>
  );
}

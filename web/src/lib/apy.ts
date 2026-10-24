import { SMUSD_POOL } from "./config";

export type Apy = {
  /** Mezo's MUSD Savings Rate (sMUSD), as an annual percentage. */
  apy: number;
  tvlUsd?: number;
  /** ISO time of the DefiLlama data point. */
  asOf: string;
  source: "DefiLlama";
  /** True when DefiLlama could not be reached and the last value we saw is shown instead. */
  stale?: boolean;
};

/** Last value read from DefiLlama's sMUSD pool, used only if the API is unreachable. */
const LAST_KNOWN: Apy = { apy: 4.23179, tvlUsd: 2066904, asOf: "2026-10-23T23:02:30.097Z", source: "DefiLlama", stale: true };

/** Mezo's MUSD Savings Rate, from DefiLlama's index of the sMUSD vault. Server only. */
export async function getApy(): Promise<Apy> {
  try {
    const res = await fetch(`https://yields.llama.fi/chart/${SMUSD_POOL}`, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error(`DefiLlama ${res.status}`);
    const body = (await res.json()) as { data?: { timestamp: string; apy: number; tvlUsd: number }[] };
    const latest = body.data?.at(-1);
    if (!latest || typeof latest.apy !== "number") throw new Error("no data");
    return { apy: latest.apy, tvlUsd: latest.tvlUsd, asOf: latest.timestamp, source: "DefiLlama" };
  } catch {
    return LAST_KNOWN;
  }
}

import { SMUSD_POOL } from "./config";

export type Apy = {
  /** Mezo's MUSD Savings Rate (sMUSD), as an annual percentage. */
  apy: number;
  /** USD saved in sMUSD on Mezo mainnet, by all savers. */
  tvlUsd?: number;
  /** ISO time of the DefiLlama data point. */
  asOf: string;
  /** Mean of the same series over the last 30 days (the rate is variable, and it swings). */
  avg30d?: number;
  source: "DefiLlama";
  /** True when DefiLlama could not be reached and the last value we saw is shown instead. */
  stale?: boolean;
};

/** Last value read from DefiLlama's sMUSD pool, used only if the API is unreachable. */
const LAST_KNOWN: Apy = {
  apy: 4.2317,
  tvlUsd: 2066747,
  asOf: "2026-10-24T09:01:48.066Z",
  avg30d: 3.4532,
  source: "DefiLlama",
  stale: true,
};

const MONTH_MS = 30 * 86_400_000;

/** Mezo's MUSD Savings Rate, from DefiLlama's index of the sMUSD vault. Server only. */
export async function getApy(): Promise<Apy> {
  try {
    const res = await fetch(`https://yields.llama.fi/chart/${SMUSD_POOL}`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`DefiLlama ${res.status}`);
    const body = (await res.json()) as { data?: { timestamp: string; apy: number; tvlUsd: number }[] };
    const data = (body.data ?? []).filter((p) => typeof p.apy === "number");
    const latest = data.at(-1);
    if (!latest) throw new Error("no data");
    const from = Date.parse(latest.timestamp) - MONTH_MS;
    const month = data.filter((p) => Date.parse(p.timestamp) >= from);
    const avg30d = month.length >= 20 ? month.reduce((a, p) => a + p.apy, 0) / month.length : undefined;
    return { apy: latest.apy, tvlUsd: latest.tvlUsd, asOf: latest.timestamp, avg30d, source: "DefiLlama" };
  } catch {
    return LAST_KNOWN;
  }
}

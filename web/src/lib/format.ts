import { formatUnits } from "viem";

/** MUSD and lsMUSD both have 18 decimals. */
export const toNum = (v: bigint | undefined) => (v === undefined ? undefined : Number(formatUnits(v, 18)));

/** Fixed locale so server and client render the same digits. */
export function fmt(n: number | undefined, dp = 2) {
  if (n === undefined || !Number.isFinite(n)) return "–";
  return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export const fmtMusd = (v: bigint | undefined, dp = 2) => fmt(toNum(v), dp);

/** Compact amounts for tight labels: 1,234 / 12.3K / 4.5M. */
export function fmtShort(n: number | undefined) {
  if (n === undefined || !Number.isFinite(n)) return "–";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 });
}

export const fmtPct = (n: number | undefined, dp = 2) => (n === undefined ? "–" : `${n.toFixed(dp)}%`);

export function ago(tsSec: number | bigint | undefined, now = Date.now()) {
  if (!tsSec) return "never";
  const s = Math.max(0, Math.floor(now / 1000) - Number(tsSec));
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172800) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Parse a user-typed MUSD amount; returns undefined for anything that isn't a clean number. */
export function parseAmount(s: string): bigint | undefined {
  if (!/^\d*\.?\d*$/.test(s) || s === "" || s === ".") return undefined;
  const [i, f = ""] = s.split(".");
  try {
    return BigInt(i || "0") * 10n ** 18n + BigInt((f + "0".repeat(18)).slice(0, 18) || "0");
  } catch {
    return undefined;
  }
}

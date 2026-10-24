import { createPublicClient, formatUnits, http, type Address } from "viem";
import { getApy } from "./apy";
import { getMarket } from "./market";
import { hubAbi, vaultAbi } from "./abis";
import { DEPLOYED, NETWORK, addresses, baseChain, chainNames, links, mezoChain, rpcUrls } from "./config";

export type CheckState = "ok" | "warn" | "down" | "idle";
export type Check = { id: string; label: string; state: CheckState; value: string; detail?: string; href?: string };
export type Status = { checkedAt: string; overall: CheckState; headline: string; note?: string; checks: Check[] };

const REPO = "Nuel-osas/levada";
const MIN = 60;
const n = (v: bigint) => Number(formatUnits(v, 18)).toLocaleString("en-US", { maximumFractionDigits: 2 });
const age = (sec: number) =>
  sec < 90 ? `${Math.round(sec)} s ago` : sec < 5400 ? `${Math.round(sec / 60)} min ago` : `${(sec / 3600).toFixed(1)} h ago`;

/** One JSON-RPC round trip, timed: the latest block number and its age. */
async function rpc(url: string) {
  const t0 = performance.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["latest", false] }),
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });
  const ms = Math.round(performance.now() - t0);
  const body = (await res.json()) as { result?: { number: string; timestamp: string } };
  if (!body.result) throw new Error("no block");
  return { ms, block: Number(BigInt(body.result.number)), blockAge: Date.now() / 1000 - Number(BigInt(body.result.timestamp)) };
}

async function chainCheck(id: string, label: string, url: string, explorer: string): Promise<Check> {
  try {
    const r = await rpc(url);
    const slow = r.ms > 2_500 || r.blockAge > 120;
    return {
      id,
      label,
      state: slow ? "warn" : "ok",
      value: `block ${r.block.toLocaleString("en-US")}`,
      detail: `${r.ms} ms · last block ${age(r.blockAge)}`,
      href: explorer,
    };
  } catch {
    return { id, label, state: "down", value: "not answering", detail: url, href: explorer };
  }
}

type Run = { status: string; conclusion: string | null; created_at: string; html_url: string };
let keeperMemo: { at: number; run: Run | null | undefined } | undefined;
/** The keeper's last GitHub Actions run (public API, 60 calls an hour without a token, so cached 2 min). */
async function keeperRun(): Promise<Run | null | undefined> {
  if (keeperMemo && Date.now() - keeperMemo.at < 120_000) return keeperMemo.run;
  let run: Run | null | undefined;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/keeper.yml/runs?per_page=1`, {
      headers: { accept: "application/vnd.github+json" },
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
    run = res.ok ? (((await res.json()) as { workflow_runs?: Run[] }).workflow_runs?.[0] ?? null) : undefined;
  } catch {
    run = undefined;
  }
  keeperMemo = { at: Date.now(), run };
  return run;
}

async function contractChecks(): Promise<Check[]> {
  const vaultHref = links.base(`address/${addresses.vault}`);
  const hubHref = links.mezo(`address/${addresses.hub}`);
  if (!DEPLOYED || !addresses.vault || !addresses.hub)
    return [
      { id: "vault", label: `Vault on ${chainNames.base}`, state: "idle", value: "not deployed yet", detail: "address published at launch" },
      { id: "hub", label: `Hub on ${chainNames.mezo}`, state: "idle", value: "not deployed yet", detail: "address published at launch" },
      { id: "report", label: "Last report from Mezo", state: "idle", value: "none yet", detail: "the keeper reports at least hourly once live" },
    ];
  const base = createPublicClient({ chain: baseChain, transport: http(rpcUrls.base, { timeout: 8_000 }) });
  const mezo = createPublicClient({ chain: mezoChain, transport: http(rpcUrls.mezo, { timeout: 8_000 }) });
  const v = { address: addresses.vault as Address, abi: vaultAbi } as const;
  const h = { address: addresses.hub as Address, abi: hubAbi } as const;
  const out: Check[] = [];
  try {
    const [paused, total, free, bufferBps, owed, hasReport, last] = await Promise.all([
      base.readContract({ ...v, functionName: "depositsPaused" }),
      base.readContract({ ...v, functionName: "totalAssets" }),
      base.readContract({ ...v, functionName: "freeIdle" }),
      base.readContract({ ...v, functionName: "bufferBps" }),
      base.readContract({ ...v, functionName: "totalOwed" }),
      base.readContract({ ...v, functionName: "hasReport" }),
      base.readContract({ ...v, functionName: "lastReport" }),
    ]);
    const target = (total * bufferBps) / 10_000n;
    out.push({
      id: "vault",
      label: `Vault on ${chainNames.base}`,
      state: paused ? "warn" : "ok",
      value: `${n(total)} MUSD saved · deposits ${paused ? "paused" : "open"}`,
      detail: `${n(free)} MUSD free for instant exits (target ${n(target)})${owed > 0n ? ` · ${n(owed)} MUSD owed to queued exits` : ""}`,
      href: vaultHref,
    });
    const reportAge = hasReport ? Date.now() / 1000 - Number(last[3]) : undefined;
    out.push({
      id: "report",
      label: "Last report from Mezo",
      state: reportAge === undefined ? "idle" : reportAge < 75 * MIN ? "ok" : reportAge < 180 * MIN ? "warn" : "down",
      value: reportAge === undefined ? "none yet" : age(reportAge),
      detail: "the keeper reports at least hourly, and whenever MUSD moves",
      href: vaultHref,
    });
  } catch {
    out.push({ id: "vault", label: `Vault on ${chainNames.base}`, state: "down", value: "can't read the vault", href: vaultHref });
  }
  try {
    const [total, sendable] = await Promise.all([
      mezo.readContract({ ...h, functionName: "totalAssets" }),
      mezo.readContract({ ...h, functionName: "sendable" }),
    ]);
    out.push({
      id: "hub",
      label: `Hub on ${chainNames.mezo}`,
      state: "ok",
      value: `${n(total)} MUSD earning in sMUSD`,
      detail: `${n(sendable)} MUSD ready to send back for exits`,
      href: hubHref,
    });
  } catch {
    out.push({ id: "hub", label: `Hub on ${chainNames.mezo}`, state: "down", value: "can't read the hub", href: hubHref });
  }
  return out;
}

async function build(): Promise<Status> {
  const [baseRpc, mezoRpc, contracts, run, apy, market] = await Promise.all([
    chainCheck("base-rpc", `${chainNames.base} RPC`, rpcUrls.base, links.base("")),
    chainCheck("mezo-rpc", `${chainNames.mezo} RPC`, rpcUrls.mezo, links.mezo("")),
    contractChecks(),
    keeperRun(),
    getApy(),
    getMarket(),
  ]);

  const runAge = run ? (Date.now() - Date.parse(run.created_at)) / 1000 : undefined;
  const keeper: Check =
    run === undefined
      ? { id: "keeper", label: "Keeper (GitHub Actions)", state: "warn", value: "can't reach GitHub", href: `https://github.com/${REPO}/actions` }
      : run === null
        ? {
            id: "keeper",
            label: "Keeper (GitHub Actions)",
            state: DEPLOYED ? "warn" : "idle",
            value: "no runs yet",
            detail: DEPLOYED ? "scheduled every 5 minutes" : "runs every 5 minutes once the contracts are live",
            href: `https://github.com/${REPO}/actions/workflows/keeper.yml`,
          }
        : {
            id: "keeper",
            label: "Keeper (GitHub Actions)",
            state: run.conclusion === "failure" ? "warn" : (runAge ?? 0) > 30 * MIN ? "warn" : "ok",
            value: `last run ${age(runAge ?? 0)}`,
            detail: run.status === "completed" ? `finished: ${run.conclusion ?? "unknown"}` : `${run.status.replace("_", " ")}`,
            href: run.html_url,
          };

  const apyAge = (Date.now() - Date.parse(apy.asOf)) / 1000;
  const data: Check[] = [
    {
      id: "rate",
      label: "sMUSD rate (DefiLlama)",
      state: apy.stale ? "warn" : apyAge < 36 * 3600 ? "ok" : "warn",
      value: `${apy.apy.toFixed(2)}% a year`,
      detail: `${apy.stale ? "DefiLlama unreachable, last known " : "data point "}${age(apyAge)}`,
      href: links.defillama,
    },
    {
      id: "supply",
      label: "MUSD on Base mainnet",
      state: market.baseMusd && !market.baseMusd.stale ? "ok" : "warn",
      value: market.baseMusd ? `${Math.round(market.baseMusd.supply).toLocaleString("en-US")} MUSD` : "unavailable",
      detail: market.baseMusd?.block ? `totalSupply() at block ${market.baseMusd.block.toLocaleString("en-US")}` : undefined,
      href: "https://basescan.org/token/0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186",
    },
  ];

  const checks = [baseRpc, mezoRpc, ...contracts, keeper, ...data];
  const live = checks.filter((c) => c.state !== "idle");
  const overall: CheckState = live.some((c) => c.state === "down") ? "down" : live.some((c) => c.state === "warn") ? "warn" : DEPLOYED ? "ok" : "idle";
  const report = checks.find((c) => c.id === "report");
  const headline =
    overall === "ok"
      ? "All systems working."
      : overall === "idle"
        ? "Live data is flowing. The contracts deploy soon."
        : report && report.state !== "ok" && report.state !== "idle"
          ? "A report from Mezo is late."
          : overall === "down"
            ? "Something isn't answering."
            : "Mostly working, one thing is slow.";
  const note =
    DEPLOYED && overall !== "ok"
      ? "Queued exits stay owed in full while anything is slow, and every keeper step is permissionless: anyone can run it (npm run once, in keeper/)."
      : NETWORK === "testnet"
        ? "Levada runs on testnet. Mezo mainnet figures are labelled as such."
        : undefined;
  return { checkedAt: new Date().toISOString(), overall, headline, note, checks };
}

let memo: { at: number; value: Promise<Status> } | undefined;
/** Live checks on both chains, the keeper and the data feeds. Memoised for 20 s so the page can't hammer the RPCs. */
export function getStatus(): Promise<Status> {
  if (memo && Date.now() - memo.at < 20_000) return memo.value;
  const value = build();
  memo = { at: Date.now(), value };
  value.catch(() => (memo = undefined));
  return value;
}

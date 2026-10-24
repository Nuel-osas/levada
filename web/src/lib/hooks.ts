"use client";

import { useEffect, useMemo, useState } from "react";
import { createPublicClient, decodeAbiParameters, http, keccak256, toHex, type Address, type Hash, type Hex } from "viem";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient, useReadContract, useReadContracts } from "wagmi";
import { DEPLOYED, addresses, baseChain, links, mezoChain, wormholeChains } from "./config";
import { erc20Abi, hubAbi, vaultAbi } from "./abis";
import type { Apy } from "./apy";
import { toNum } from "./format";

/** Mezo is read directly (the wallet only ever talks to Base). JSON-RPC calls are batched. */
export const mezoClient = createPublicClient({ chain: mezoChain, transport: http(undefined, { batch: true }) });

const VAULT = (addresses.vault ?? "0x0000000000000000000000000000000000000000") as Address;
const HUB = (addresses.hub ?? "0x0000000000000000000000000000000000000000") as Address;
const NOBODY = "0x0000000000000000000000000000000000000000" as Address;
const YEAR_MS = 365 * 24 * 3600 * 1000;

export function useApy() {
  return useQuery({
    queryKey: ["apy"],
    queryFn: async () => {
      const res = await fetch("/api/apy");
      if (!res.ok) throw new Error("apy");
      return (await res.json()) as Apy;
    },
    staleTime: 600_000,
    refetchInterval: 600_000,
  }).data;
}

/** Vault state on Base, plus the connected wallet's position. */
export function useVault() {
  const { address } = useAccount();
  const user = address ?? NOBODY;
  const v = { address: VAULT, abi: vaultAbi } as const;
  const res = useReadContracts({
    allowFailure: false,
    query: { enabled: DEPLOYED, refetchInterval: 10_000 },
    contracts: [
      { ...v, functionName: "totalAssets" },
      { ...v, functionName: "totalSupply" },
      { ...v, functionName: "freeIdle" },
      { ...v, functionName: "pendingFromHub" },
      { ...v, functionName: "arrivedFromHub" },
      { ...v, functionName: "bridgedOut" },
      { ...v, functionName: "hubProfit" },
      { ...v, functionName: "lockedProfitNow" },
      { ...v, functionName: "lastReport" },
      { ...v, functionName: "hasReport" },
      { ...v, functionName: "bufferBps" },
      { ...v, functionName: "depositsPaused" },
      { ...v, functionName: "maxDeposit", args: [user] },
      { ...v, functionName: "balanceOf", args: [user] },
      { ...v, functionName: "maxWithdraw", args: [user] },
      { ...v, functionName: "maxRedeem", args: [user] },
      { ...v, functionName: "owed", args: [user] },
      { address: addresses.baseMusd, abi: erc20Abi, functionName: "balanceOf", args: [user] },
      { address: addresses.baseMusd, abi: erc20Abi, functionName: "allowance", args: [user, VAULT] },
      { ...v, functionName: "bridgeable" },
      { ...v, functionName: "PROFIT_UNLOCK" },
    ],
  });
  const d = res.data;
  const shares = d?.[13];
  // The position, valued by the vault itself.
  const position = useReadContract({
    ...v,
    functionName: "convertToAssets",
    args: [shares ?? 0n],
    query: { enabled: DEPLOYED && !!shares, refetchInterval: 10_000 },
  });
  return {
    refetch: async () => {
      await res.refetch();
      await position.refetch();
    },
    isLoading: res.isLoading,
    isError: res.isError,
    totalAssets: d?.[0],
    totalSupply: d?.[1],
    freeIdle: d?.[2],
    pendingFromHub: d?.[3],
    arrivedFromHub: d?.[4],
    bridgedOut: d?.[5],
    hubProfit: d?.[6],
    lockedProfit: d?.[7],
    lastReport: d?.[8],
    hasReport: d?.[9],
    bufferBps: d?.[10],
    depositsPaused: d?.[11],
    maxDeposit: d?.[12],
    shares,
    maxWithdraw: d?.[14],
    maxRedeem: d?.[15],
    owed: d?.[16],
    walletMusd: d?.[17],
    allowance: d?.[18],
    /** MUSD above the buffer target that the keeper's next run sends to Mezo. */
    bridgeable: d?.[19],
    /** Seconds over which each report's gain is released into the share price. */
    profitUnlock: d?.[20],
    /** convertToAssets(shares): the wallet's savings in MUSD, as the vault values them now. */
    position: shares === 0n ? 0n : position.data,
  };
}
export type VaultState = ReturnType<typeof useVault>;

/** The hub's position on Mezo, read straight from Mezo. */
export function useHub() {
  return useQuery({
    queryKey: ["hub", HUB],
    enabled: DEPLOYED,
    refetchInterval: 15_000,
    queryFn: async () => {
      const read = { address: HUB, abi: hubAbi } as const;
      const [totalAssets, cumulativeIn, cumulativeOut, knownIdle, accruedFees, feeBps, sendable, savingsPrincipal] =
        await Promise.all([
          mezoClient.readContract({ ...read, functionName: "totalAssets" }),
          mezoClient.readContract({ ...read, functionName: "cumulativeIn" }),
          mezoClient.readContract({ ...read, functionName: "cumulativeOut" }),
          mezoClient.readContract({ ...read, functionName: "knownIdle" }),
          mezoClient.readContract({ ...read, functionName: "accruedFees" }),
          mezoClient.readContract({ ...read, functionName: "feeBps" }),
          mezoClient.readContract({ ...read, functionName: "sendable" }),
          mezoClient.readContract({ ...read, functionName: "savingsPrincipal" }),
        ]);
      return { totalAssets, cumulativeIn, cumulativeOut, knownIdle, accruedFees, feeBps, sendable, savingsPrincipal };
    },
  }).data;
}
export type HubState = ReturnType<typeof useHub>;

const sub0 = (a: bigint, b: bigint) => (a > b ? a - b : 0n);

/** Where every MUSD is right now, in the scene's left-to-right order (Mezo, bridge, Base, yield). */
export function useFlows(vault: VaultState, hub: HubState) {
  if (!DEPLOYED || vault.totalAssets === undefined) return undefined;
  const crossingOut = hub && vault.bridgedOut !== undefined ? sub0(vault.bridgedOut, hub.cumulativeIn) : 0n;
  const crossingBack = hub && vault.arrivedFromHub !== undefined ? sub0(hub.cumulativeOut, vault.arrivedFromHub) : 0n;
  // Live yield on Mezo (ahead of reports). Before the hub answers, fall back to what the vault has booked.
  const earned = hub
    ? sub0(hub.totalAssets + hub.cumulativeOut, hub.cumulativeIn)
    : vault.hubProfit !== undefined && vault.hubProfit > 0n
      ? vault.hubProfit
      : 0n;
  return {
    onMezo: hub?.totalAssets,
    crossing: crossingOut + crossingBack,
    crossingOut,
    crossingBack,
    buffer: vault.freeIdle,
    earned,
    unlocking: vault.lockedProfit,
  };
}

/**
 * What a saver actually earns, as a fraction per year: Mezo's rate, less Levada's fee on yield,
 * on the part of the vault that is on Mezo (the Base buffer earns nothing).
 */
export function netRate(apy: number | undefined, feeBps?: bigint, bufferBps?: bigint) {
  if (apy === undefined) return undefined;
  const fee = feeBps === undefined ? 0 : Number(feeBps) / 10_000;
  const buffer = bufferBps === undefined ? 0 : Number(bufferBps) / 10_000;
  return (apy / 100) * (1 - fee) * (1 - buffer);
}

/** Wall-clock time, ticking. Zero until mounted so server and client render the same digits. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * A live estimate that starts from an on-chain value and grows by `perYear` (same unit) per year.
 * It never jumps back: it re-anchors only when the chain value overtakes it or `key` changes
 * (for example when the wallet's share count changes).
 */
export function useEstimate(base: number | undefined, perYear: number, key: string, now: number) {
  const [anchor, setAnchor] = useState<{ v: number; t: number; key: string }>();
  useEffect(() => {
    if (base === undefined) return;
    setAnchor((a) => {
      const t = Date.now();
      if (!a || a.key !== key) return { v: base, t, key };
      const est = a.v + (perYear * (t - a.t)) / YEAR_MS;
      return base > est ? { v: base, t, key } : a;
    });
  }, [base, key, perYear]);
  if (base === undefined) return undefined;
  if (!anchor || anchor.key !== key || now === 0) return base;
  return anchor.v + (perYear * Math.max(0, now - anchor.t)) / YEAR_MS;
}

/**
 * The numbers behind the big odometer and the mobile bar, ticking every second:
 * - "mine": the wallet's savings, convertToAssets(shares) extrapolated at the saver's net rate;
 * - "earned": yield earned by all savers on Mezo, extrapolated at the hub's rate after fees;
 * - "example": before launch, 1,000 MUSD at Mezo's rate (clearly labelled as an example).
 */
export function useSavings() {
  const apy = useApy();
  const vault = useVault();
  const hub = useHub();
  const flows = useFlows(vault, hub);
  const { address } = useAccount();
  const now = useNow(1000);
  const rate = netRate(apy?.apy, hub?.feeBps, vault.bufferBps);
  const hubRate = netRate(apy?.apy, hub?.feeBps);
  const pos = toNum(vault.position);
  const hasPosition = DEPLOYED && !!address && !!vault.shares && vault.shares > 0n;
  const mine = useEstimate(hasPosition ? pos : undefined, (pos ?? 0) * (rate ?? 0), `${address}:${vault.shares}`, now);
  const earned = useEstimate(
    DEPLOYED && flows ? toNum(flows.earned) : undefined,
    (toNum(hub?.totalAssets) ?? 0) * (hubRate ?? 0),
    "earned",
    now,
  );
  const example = useEstimate(1000, 10 * (apy?.apy ?? 0), "example", now);
  const mode: "mine" | "earned" | "example" = hasPosition ? "mine" : DEPLOYED ? "earned" : "example";
  return { mode, apy, rate, vault, hub, flows, pos, mine, earned, example, now };
}

/* ------------------------------------------------------------------ exits */

type ExitMeta = { sequence: bigint; txHash?: Hash };
const metaKey = (id: bigint) => `levada:exit:${baseChain.id}:${VAULT.toLowerCase()}:${id}`;

/** Remember what the request transaction told us, so the timeline is exact from the first second. */
export function rememberExit(id: bigint, meta: ExitMeta) {
  try {
    localStorage.setItem(metaKey(id), JSON.stringify({ sequence: meta.sequence.toString(), txHash: meta.txHash }));
  } catch {}
}
function recallExit(id: bigint): ExitMeta | undefined {
  try {
    const raw = localStorage.getItem(metaKey(id));
    if (!raw) return undefined;
    const m = JSON.parse(raw) as { sequence: string; txHash?: Hash };
    return { sequence: BigInt(m.sequence), txHash: m.txHash };
  } catch {
    return undefined;
  }
}

const emitter = (a: Address) => a.toLowerCase().replace("0x", "").padStart(64, "0");

/** A signed withdrawal message: its hash (what the hub keys `sent` by), the MUSD it asks for, and the Base tx. */
type SignedRequest = { digest: Hex; amount: bigint; txHash?: Hash };

async function fetchSignedRequest(sequence: bigint): Promise<SignedRequest | null> {
  const res = await fetch(
    `${links.wormholescanApi}/api/v1/vaas/${wormholeChains.base}/${emitter(VAULT)}/${sequence}`,
    { headers: { accept: "application/json" } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`wormholescan ${res.status}`);
  const body = (await res.json()) as { data?: { vaa?: string; txHash?: string } };
  if (!body.data?.vaa) return null;
  const bytes = Uint8Array.from(atob(body.data.vaa), (c) => c.charCodeAt(0));
  const sigs = bytes[5];
  const vmBody = bytes.slice(6 + sigs * 66);
  // body: timestamp(4) nonce(4) emitterChain(2) emitter(32) sequence(8) consistency(1), then the payload
  const [, amount] = decodeAbiParameters(
    [{ type: "uint8" }, { type: "uint256" }, { type: "uint64" }],
    toHex(vmBody.slice(51)),
  );
  const tx = body.data.txHash;
  return {
    digest: keccak256(keccak256(toHex(vmBody))),
    amount,
    txHash: tx ? ((tx.startsWith("0x") ? tx : `0x${tx}`) as Hash) : undefined,
  };
}

export type ExitView = {
  id: bigint;
  assets: bigint;
  /** Needed MUSD from Mezo. False when the free buffer on Base covered it all. */
  viaHub: boolean;
  paid: boolean;
  claimable: boolean;
  txHash?: Hash;
  /** Signed by Wormhole's guardians (the hub can act on it). */
  signed: boolean;
  /** MUSD asked of the hub, and how much of it the hub has sent so far. */
  requested?: bigint;
  released?: bigint;
};

/**
 * The connected wallet's queued exits with a live timeline:
 * requested (Base) -> signed by Wormhole guardians -> released from Mezo -> paid.
 */
export function useExits() {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: baseChain.id });
  const enabled = DEPLOYED && !!address;
  const v = { address: VAULT, abi: vaultAbi } as const;

  const ids = useReadContract({
    ...v,
    functionName: "exitsOf",
    args: [address ?? NOBODY],
    query: { enabled, refetchInterval: 8_000 },
  });
  const recent = useMemo(() => (ids.data ?? []).slice(-6), [ids.data]);

  const rows = useReadContracts({
    allowFailure: false,
    query: { enabled: enabled && recent.length > 0, refetchInterval: 8_000 },
    contracts: recent.flatMap((id) => [
      { ...v, functionName: "exits", args: [id] } as const,
      { ...v, functionName: "isClaimable", args: [id] } as const,
    ]),
  });

  // Keep showing exits that were open when this page first saw them, so the user sees them land.
  const [watched, setWatched] = useState<Set<string>>(() => new Set());
  const base = useMemo(() => {
    const d = rows.data;
    if (!d) return [];
    return recent.map((id, i) => {
      const [, assets, queuePos, paid] = d[i * 2] as readonly [Address, bigint, bigint, boolean];
      return { id, assets, queuePos, paid, claimable: d[i * 2 + 1] as boolean };
    });
  }, [rows.data, recent]);
  useEffect(() => {
    const open = base.filter((e) => !e.paid).map((e) => e.id.toString());
    if (open.some((id) => !watched.has(id))) setWatched((w) => new Set([...w, ...open]));
  }, [base, watched]);
  const shown = base.filter((e) => !e.paid || watched.has(e.id.toString()));

  // Wormhole sequence of each hub request. The vault publishes exactly one message per exit that
  // asks the hub (queuePos > 0), so the sequence is the count of such exits before it.
  const hubExits = shown.filter((e) => e.queuePos > 0n && !e.paid);
  const unknown = hubExits.filter((e) => !recallExit(e.id));
  const maxUnknown = unknown.length ? unknown.reduce((m, e) => (e.id > m ? e.id : m), 0n) : undefined;
  const derived = useQuery({
    queryKey: ["exit-sequences", VAULT, maxUnknown?.toString()],
    enabled: maxUnknown !== undefined && !!client,
    staleTime: Infinity,
    queryFn: async () => {
      const seqs = new Map<string, bigint>();
      let n = 0n;
      for (let start = 0n; start <= maxUnknown!; start += 200n) {
        const end = start + 200n > maxUnknown! + 1n ? maxUnknown! + 1n : start + 200n;
        const contracts = [];
        for (let i = start; i < end; i++) contracts.push({ ...v, functionName: "exits", args: [i] } as const);
        const res = await client!.multicall({ allowFailure: false, contracts });
        res.forEach((e, k) => {
          const queuePos = (e as readonly [Address, bigint, bigint, boolean])[2];
          if (queuePos > 0n) seqs.set((start + BigInt(k)).toString(), n++);
        });
      }
      return seqs;
    },
  });
  const metaOf = (id: bigint): ExitMeta | undefined => {
    const m = recallExit(id);
    if (m) return m;
    const s = derived.data?.get(id.toString());
    return s === undefined ? undefined : { sequence: s };
  };

  const signed = useQueries({
    queries: hubExits.map((e) => {
      const seq = metaOf(e.id)?.sequence;
      return {
        queryKey: ["vaa", VAULT, seq?.toString()],
        enabled: seq !== undefined,
        staleTime: Infinity,
        refetchInterval: (q: { state: { data?: SignedRequest | null } }) => (q.state.data ? false : 5_000),
        queryFn: () => fetchSignedRequest(seq!),
      };
    }),
  });

  const digests = hubExits.map((e, i) => ({ id: e.id, req: signed[i]?.data ?? undefined }));
  const sent = useQuery({
    queryKey: ["hub-sent", digests.map((d) => d.req?.digest ?? "").join(",")],
    enabled: DEPLOYED && digests.some((d) => d.req),
    refetchInterval: 8_000,
    queryFn: async () => {
      const out = new Map<string, bigint>();
      await Promise.all(
        digests.map(async (d) => {
          if (!d.req) return;
          const s = await mezoClient.readContract({ address: HUB, abi: hubAbi, functionName: "sent", args: [d.req.digest] });
          out.set(d.id.toString(), s);
        }),
      );
      return out;
    },
  });

  const exits: ExitView[] = shown
    .map((e) => {
      const i = hubExits.findIndex((h) => h.id === e.id);
      const req = i >= 0 ? (signed[i]?.data ?? undefined) : undefined;
      const done = e.paid || e.claimable;
      return {
        id: e.id,
        assets: e.assets,
        viaHub: e.queuePos > 0n,
        paid: e.paid,
        claimable: e.claimable && !e.paid,
        txHash: metaOf(e.id)?.txHash ?? req?.txHash,
        // Once the MUSD has landed on Base, every earlier step has necessarily happened.
        signed: done || !!req,
        requested: req?.amount,
        released: done ? req?.amount : sent.data?.get(e.id.toString()),
      };
    })
    .reverse();

  return {
    exits,
    refetch: async () => {
      await ids.refetch();
      await rows.refetch();
    },
  };
}


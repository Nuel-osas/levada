import { NextResponse } from "next/server";
import {
  BaseError,
  createPublicClient,
  createWalletClient,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseEther,
  parseUnits,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { erc20Abi } from "@/lib/abis";
import { NETWORK, addresses, rpcUrls } from "@/lib/config";
import { faucetKey } from "@/lib/faucet-key";

/**
 * Test-MUSD faucet for judges and testers (testnet only).
 * POST {address}: sends 250 test MUSD on Base Sepolia, plus 0.0005 Base Sepolia ETH for gas when the
 * wallet has less than that. One claim per address and per IP every 24 hours (in memory, per server
 * instance), and none for a wallet that already holds 100 test MUSD or more.
 * The key comes from FAUCET_PRIVATE_KEY (server only). Use a dedicated low-balance key, never the keeper's.
 */
export const dynamic = "force-dynamic";
/** Balance checks, two sends and a short wait for the receipt fit well inside this (Vercel) limit. */
export const maxDuration = 30;

const AMOUNT = parseUnits("250", 18);
const ENOUGH = parseUnits("100", 18);
const GAS = parseEther("0.0005");
/** Kept back for the faucet's own transaction fees. */
const FEE_RESERVE = parseEther("0.0001");
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const NO_STORE = { "cache-control": "no-store" };

function make(key: Hex) {
  const account = privateKeyToAccount(key);
  // FAUCET_RPC_URL (optional, server only): a private Base Sepolia endpoint; defaults to the public one.
  const transport = http(process.env.FAUCET_RPC_URL || rpcUrls.base, { timeout: 15_000 });
  return {
    account,
    pub: createPublicClient({ chain: baseSepolia, transport }),
    wallet: createWalletClient({ account, chain: baseSepolia, transport }),
  };
}
type Faucet = ReturnType<typeof make>;

let faucetCache: Faucet | null | undefined;
/** The faucet wallet, or null when FAUCET_PRIVATE_KEY is unset or malformed. The key is never logged or returned. */
function faucet(): Faucet | null {
  if (faucetCache !== undefined) return faucetCache;
  const key = faucetKey();
  faucetCache = key ? make(key) : null;
  return faucetCache;
}

class FaucetError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const fail = (status: number, code: string, error: string, extra?: Record<string, unknown>, headers?: Record<string, string>) =>
  NextResponse.json({ error, code, ...extra }, { status, headers: { ...NO_STORE, ...headers } });

/* ---------- 24-hour cooldowns, per address and per IP ---------- */
const byAddress = new Map<string, number>();
const byIp = new Map<string, number>();
function prune(now: number) {
  for (const m of [byAddress, byIp]) for (const [k, t] of m) if (now - t >= COOLDOWN_MS) m.delete(k);
}
const left = (m: Map<string, number>, k: string, now: number) => {
  const t = m.get(k);
  return t === undefined ? 0 : Math.max(0, t + COOLDOWN_MS - now);
};
const human = (ms: number) => {
  const min = Math.ceil(ms / 60_000);
  return min >= 90 ? `${Math.round(min / 60)} h` : `${min} min`;
};
function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || "unknown";
}

/* ---------- One send at a time, with a local nonce so a lagging RPC can't hand out the same one twice ---------- */
let tail: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = tail.then(fn, fn);
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
let nextNonce: number | undefined;
let lastSentAt = 0;
async function takeNonce(f: Faucet) {
  const pending = await f.pub.getTransactionCount({ address: f.account.address, blockTag: "pending" });
  // A gap that lasts minutes means a transaction was dropped: trust the chain again.
  if (nextNonce !== undefined && pending < nextNonce && Date.now() - lastSentAt > 120_000) nextNonce = undefined;
  return nextNonce === undefined ? pending : Math.max(pending, nextNonce);
}
function used(nonce: number) {
  nextNonce = nonce + 1;
  lastSentAt = Date.now();
}

/** Checks balances, then broadcasts the MUSD transfer and, if the wallet needs it, a little ETH for gas. */
async function broadcast(f: Faucet, to: `0x${string}`) {
  const token = { address: addresses.baseMusd, abi: erc20Abi } as const;
  const [has, hasEth, stock, stockEth] = await Promise.all([
    f.pub.readContract({ ...token, functionName: "balanceOf", args: [to] }),
    f.pub.getBalance({ address: to }),
    f.pub.readContract({ ...token, functionName: "balanceOf", args: [f.account.address] }),
    f.pub.getBalance({ address: f.account.address }),
  ]);
  if (has >= ENOUGH)
    throw new FaucetError(
      409,
      "already_funded",
      `Already funded: this wallet holds ${Number(formatUnits(has, 18)).toLocaleString("en-US", { maximumFractionDigits: 2 })} test MUSD.`,
    );
  const needGas = hasEth < GAS;
  if (stock < AMOUNT || stockEth < FEE_RESERVE + (needGas ? GAS : 0n))
    throw new FaucetError(503, "empty", "Faucet empty: it's being refilled. Please try again later.");

  let nonce = await takeNonce(f);
  const musdTx = await f.wallet.writeContract({ ...token, functionName: "transfer", args: [to, AMOUNT], nonce });
  used(nonce);
  let ethTx: Hash | undefined;
  if (needGas) {
    nonce += 1;
    try {
      ethTx = await f.wallet.sendTransaction({ to, value: GAS, nonce });
      used(nonce);
    } catch (e) {
      // The MUSD is on its way; gas is a courtesy, so report it rather than fail the claim.
      console.error("faucet: gas top-up failed:", e instanceof BaseError ? e.shortMessage : "unexpected error");
    }
  }
  return { musdTx, ethTx };
}

/** Is the faucet available? 503 "faucet not configured" when the server has no key (the UI then hides it). */
export async function GET() {
  if (NETWORK !== "testnet") return fail(404, "testnet_only", "The faucet only runs on testnet.");
  if (!faucet()) return fail(503, "not_configured", "faucet not configured");
  return NextResponse.json(
    { ok: true, amount: "250", gas: "0.0005", token: addresses.baseMusd, chainId: baseSepolia.id },
    { headers: NO_STORE },
  );
}

export async function POST(req: Request) {
  if (NETWORK !== "testnet") return fail(404, "testnet_only", "The faucet only runs on testnet.");
  const f = faucet();
  if (!f) return fail(503, "not_configured", "faucet not configured");

  const body: unknown = await req.json().catch(() => null);
  const raw = body && typeof body === "object" ? (body as { address?: unknown }).address : undefined;
  if (typeof raw !== "string" || !isAddress(raw)) return fail(400, "invalid_address", "That isn't a valid wallet address.");
  const to = getAddress(raw);
  const ip = clientIp(req);

  const now = Date.now();
  prune(now);
  const wait = Math.max(left(byAddress, to, now), left(byIp, ip, now));
  if (wait > 0)
    return fail(
      429,
      "cooldown",
      `Cooldown: one claim per wallet and per connection every 24 hours. Try again in ${human(wait)}.`,
      { retryAfter: Math.ceil(wait / 1000) },
      { "retry-after": String(Math.ceil(wait / 1000)) },
    );

  // Reserve both slots before the first await, so parallel requests can't claim twice.
  byAddress.set(to, now);
  byIp.set(ip, now);
  const release = () => {
    byAddress.delete(to);
    byIp.delete(ip);
  };

  let sent: { musdTx: Hash; ethTx?: Hash };
  try {
    sent = await serial(() => broadcast(f, to));
  } catch (e) {
    release();
    if (e instanceof FaucetError) return fail(e.status, e.code, e.message);
    console.error("faucet: send failed:", e instanceof BaseError ? e.shortMessage : "unexpected error");
    return fail(502, "send_failed", "The faucet couldn't send just now. Please try again in a minute.");
  }

  // Base Sepolia confirms in about 2 s. If the receipt is slow, the transfer is still on its way: say so, with its hash.
  const receipt = await f.pub.waitForTransactionReceipt({ hash: sent.musdTx, timeout: 12_000 }).catch(() => undefined);
  if (receipt && receipt.status !== "success") {
    release();
    return fail(502, "send_failed", "The transfer reverted. Please try again.", { musdTx: sent.musdTx });
  }
  return NextResponse.json(
    { ok: true, amount: "250", musdTx: sent.musdTx, ethTx: sent.ethTx, confirmed: !!receipt },
    { headers: NO_STORE },
  );
}

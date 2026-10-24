import { decodeFunctionResult, encodeFunctionData, formatUnits, hexToNumber, type Hex } from "viem";
import { erc20Abi } from "./abis";
import { MAINNET } from "./config";

export type Price = { usd: number; asOf: string };

/** Live Mezo mainnet figures. Server only: the client reads them through /api/market. */
export type Market = {
  /** MUSD on Base mainnet: totalSupply() of the bridged token, read from Base. */
  baseMusd?: { supply: number; asOf: string; block?: number; stale?: boolean };
  /** Spot prices from DefiLlama's coins API. A coin that is missing is left out, never guessed. */
  prices: { btc?: Price; musd?: Price; mezo?: Price };
};

/** Last value read from Base, used only if the RPC is unreachable (shown with its date). */
const SUPPLY_LAST_KNOWN = { supply: 1_016_314.37, asOf: "2026-10-24T09:56:11.000Z", block: 53_023_212, stale: true };

/** totalSupply() of MUSD on Base mainnet, with the time of the block it was read at. */
export async function getBaseSupply(): Promise<NonNullable<Market["baseMusd"]>> {
  try {
    const data = encodeFunctionData({ abi: erc20Abi, functionName: "totalSupply" });
    const res = await fetch(MAINNET.baseRpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([
        { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: MAINNET.baseMusd, data }, "latest"] },
        { jsonrpc: "2.0", id: 2, method: "eth_getBlockByNumber", params: ["latest", false] },
      ]),
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`Base RPC ${res.status}`);
    const out = (await res.json()) as { id: number; result?: unknown }[];
    const call = out.find((r) => r.id === 1)?.result as Hex | undefined;
    const block = out.find((r) => r.id === 2)?.result as { number?: Hex; timestamp?: Hex } | undefined;
    if (!call || call === "0x") throw new Error("no result");
    const raw = decodeFunctionResult({ abi: erc20Abi, functionName: "totalSupply", data: call });
    const ts = block?.timestamp ? hexToNumber(block.timestamp) * 1000 : Date.now();
    return {
      supply: Number(formatUnits(raw, 18)),
      asOf: new Date(ts).toISOString(),
      block: block?.number ? hexToNumber(block.number) : undefined,
    };
  } catch {
    return { ...SUPPLY_LAST_KNOWN };
  }
}

/** DefiLlama coin ids, each checked to return a price: BTC, MUSD (on Base) and MEZO. */
const COINS = {
  btc: "coingecko:bitcoin",
  musd: `base:${MAINNET.baseMusd}`,
  mezo: "coingecko:mezo",
} as const;

export async function getPrices(): Promise<Market["prices"]> {
  try {
    const res = await fetch(`https://coins.llama.fi/prices/current/${Object.values(COINS).join(",")}`, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`DefiLlama coins ${res.status}`);
    const body = (await res.json()) as { coins?: Record<string, { price?: number; timestamp?: number }> };
    const coins = Object.fromEntries(Object.entries(body.coins ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
    const pick = (id: string): Price | undefined => {
      const c = coins[id.toLowerCase()];
      return c && typeof c.price === "number" && c.price > 0 && typeof c.timestamp === "number"
        ? { usd: c.price, asOf: new Date(c.timestamp * 1000).toISOString() }
        : undefined;
    };
    return { btc: pick(COINS.btc), musd: pick(COINS.musd), mezo: pick(COINS.mezo) };
  } catch {
    return {};
  }
}

export async function getMarket(): Promise<Market> {
  const [baseMusd, prices] = await Promise.all([getBaseSupply(), getPrices()]);
  return { baseMusd, prices };
}

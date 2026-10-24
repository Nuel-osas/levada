import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { defineChain, type Address, type Chain, type Hex } from "viem";
import { base, baseSepolia } from "viem/chains";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export type Network = "testnet" | "mainnet";

type ChainCfg = {
  chainId: number;
  wormholeChain: number;
  rpc: string;
  explorer: string;
  musd: Address;
  ntt: Address;
  transceiver: Address;
  wormhole: Address;
  savings?: Address;
};

export type Config = {
  network: Network;
  mezo: ChainCfg & { chain: Chain };
  base: ChainCfg & { chain: Chain };
  wormholescan: string;
  vault: Address;
  hub: Address;
  privateKey: Hex;
  reportIntervalSec: number;
};

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

export function loadConfig(): Config {
  loadEnv(join(root, ".env.keeper"));
  const network = (process.env.NETWORK ?? "testnet") as Network;
  const all = JSON.parse(readFileSync(join(root, "deployments", "networks.json"), "utf8"));
  const net = all[network];
  const deployment = JSON.parse(readFileSync(join(root, "deployments", `${network}.json`), "utf8"));
  const privateKey = process.env.KEEPER_PRIVATE_KEY as Hex | undefined;
  if (!privateKey) throw new Error("KEEPER_PRIVATE_KEY missing");

  const mezoChain = defineChain({
    id: net.mezo.chainId,
    name: network === "mainnet" ? "Mezo" : "Mezo Testnet",
    nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
    rpcUrls: { default: { http: [process.env.MEZO_RPC ?? net.mezo.rpc] } },
    blockExplorers: { default: { name: "Mezo Explorer", url: net.mezo.explorer } },
  });
  const baseChain = network === "mainnet" ? base : baseSepolia;

  return {
    network,
    mezo: { ...net.mezo, rpc: process.env.MEZO_RPC ?? net.mezo.rpc, chain: mezoChain },
    base: { ...net.base, rpc: process.env.BASE_RPC ?? net.base.rpc, chain: baseChain },
    wormholescan: net.wormholescan,
    vault: deployment.vault,
    hub: deployment.hub,
    privateKey,
    reportIntervalSec: Number(process.env.REPORT_INTERVAL_SEC ?? 3600),
  };
}

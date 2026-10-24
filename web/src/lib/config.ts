import { defineChain, type Address } from "viem";
import { base, baseSepolia } from "viem/chains";
import networks from "./deployments/networks.json";
import testnet from "./deployments/testnet.json";
import mainnet from "./deployments/mainnet.json";

export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK ?? "testnet") as "testnet" | "mainnet";
const net = networks[NETWORK];
const deployment = (NETWORK === "mainnet" ? mainnet : testnet) as { vault: Address | null; hub: Address | null };

export const baseChain = NETWORK === "mainnet" ? base : baseSepolia;

/** JSON-RPC endpoints for this network. Optional overrides point the app at a dedicated (less rate-limited) RPC. */
export const rpcUrls = {
  base: process.env.NEXT_PUBLIC_BASE_RPC_URL || net.base.rpc,
  mezo: process.env.NEXT_PUBLIC_MEZO_RPC_URL || net.mezo.rpc,
};

export const mezoChain = defineChain({
  id: net.mezo.chainId,
  name: NETWORK === "mainnet" ? "Mezo" : "Mezo Testnet",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrls.mezo] } },
  blockExplorers: { default: { name: "Mezo Explorer", url: net.mezo.explorer } },
});

export const addresses = {
  vault: deployment.vault,
  hub: deployment.hub,
  baseMusd: net.base.musd as Address,
  mezoMusd: net.mezo.musd as Address,
  savings: net.mezo.savings as Address,
  baseNtt: net.base.ntt as Address,
  mezoNtt: net.mezo.ntt as Address,
};

/** Both contracts are live. Until then the page shows the full design with deposits "opening soon". */
export const DEPLOYED = !!(addresses.vault && addresses.hub);

export const links = {
  base: (path: string) => `${net.base.explorer}/${path}`,
  mezo: (path: string) => `${net.mezo.explorer}/${path}`,
  wormholescan: (txHash: string) =>
    `https://wormholescan.io/#/tx/${txHash}${NETWORK === "testnet" ? "?network=Testnet" : ""}`,
  wormholescanApi: net.wormholescan,
  defillama: "https://defillama.com/yields/pool/515e257a-3a9c-418b-93fc-acabf4021905",
};

export const wormholeChains = { mezo: net.mezo.wormholeChain, base: net.base.wormholeChain };

/** Mainnet MUSD on Base and Mezo's sMUSD, for the live "Mezo mainnet today" figures (whatever NETWORK is). */
export const MAINNET = {
  baseRpc: networks.mainnet.base.rpc,
  baseMusd: networks.mainnet.base.musd as Address,
  savings: networks.mainnet.mezo.savings as Address,
};

/**
 * Launch settings from contracts/script/Deploy.s.sol (FEE_BPS and BUFFER_BPS defaults). Used for
 * estimates before the contracts are live; after that the app reads feeBps and bufferBps on-chain.
 */
export const LAUNCH = { feeBps: 1_000n, bufferBps: 1_000n };

/**
 * Mezo's own app, for people who already hold MUSD or BTC there. Paths are from mezo.org's route
 * table (/earn/vaults/$vaultAddress names the sMUSD vault "MUSD Savings Vault").
 */
const mezoApp = NETWORK === "mainnet" ? "https://mezo.org" : "https://testnet.mezo.org";
export const mezoLinks = {
  savingsVault: `${mezoApp}/earn/vaults/${net.mezo.savings}`,
  borrow: `${mezoApp}/borrow`,
  faucet: NETWORK === "testnet" ? "https://faucet.test.mezo.org/" : undefined,
};

/** Human names for the two chains on this network. */
export const chainNames =
  NETWORK === "mainnet" ? { base: "Base", mezo: "Mezo" } : { base: "Base Sepolia", mezo: "Mezo testnet" };

/** DefiLlama pool for sMUSD (unstaked base yield), the position the hub holds. */
export const SMUSD_POOL = "515e257a-3a9c-418b-93fc-acabf4021905";

/** Brand strings in one place so a rename is a one-line change. */
export const BRAND = {
  name: "Levada",
  token: "lsMUSD",
  tokenName: "Levada Savings MUSD",
  tagline: "Mezo's savings rate, on Base.",
};

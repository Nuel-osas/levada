# Levada web

Next.js app for Levada. See the [root README](../README.md).

```bash
npm ci
npm run dev            # syncs ../deployments and ../brand first
NEXT_PUBLIC_NETWORK=testnet npm run build
```

Env:
- `NEXT_PUBLIC_NETWORK` (testnet|mainnet), `NEXT_PUBLIC_WC_PROJECT_ID` (WalletConnect), `NEXT_PUBLIC_SITE_URL`.
- `FAUCET_PRIVATE_KEY` (server only, testnet): a dedicated, low-balance key holding Base Sepolia test MUSD and ETH. It powers
  `POST /api/faucet` (250 test MUSD, plus 0.0005 ETH when the wallet has less). Unset, the route answers 503 and the
  button is hidden. Never the keeper key.
- `FAUCET_RPC_URL` (optional, server only): a private Base Sepolia RPC for the faucet; defaults to the public one.
- `NEXT_PUBLIC_BASE_RPC_URL`, `NEXT_PUBLIC_MEZO_RPC_URL` (optional, build time): dedicated RPCs for the app's reads;
  default to `deployments/networks.json`.

Live data (no keys): `/api/apy` (sMUSD rate and TVL, DefiLlama) and `/api/market` (MUSD supply on Base mainnet via Base RPC;
BTC, MUSD and MEZO prices via DefiLlama).

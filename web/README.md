# Levada web

Next.js app for Levada. See the [root README](../README.md).

```bash
npm ci
npm run dev            # syncs ../deployments and ../brand first
NEXT_PUBLIC_NETWORK=testnet npm run build
```

Env: `NEXT_PUBLIC_NETWORK` (testnet|mainnet), `NEXT_PUBLIC_WC_PROJECT_ID` (WalletConnect), `NEXT_PUBLIC_SITE_URL`.

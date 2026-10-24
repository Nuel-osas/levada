import type { NextConfig } from "next";

// @coinbase/cdp-sdk (pulled in by wagmi's Base Account connector) optionally imports the
// x402 client packages, and MetaMask's SDK optionally imports React Native storage. The app
// never uses them, so resolve them to empty modules.
const optional = [
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm/exact/client",
  "@react-native-async-storage/async-storage",
];

const nextConfig: NextConfig = {
  // This app is self-contained in web/; don't infer a workspace root from other lockfiles.
  outputFileTracingRoot: __dirname,
  webpack(config) {
    config.resolve.alias = { ...config.resolve.alias, ...Object.fromEntries(optional.map((m) => [m, false])) };
    // WalletConnect's logger has optional node-only deps.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // viem's chain list includes Tempo, whose ox helpers use a dynamic import we never reach.
    config.ignoreWarnings = [...(config.ignoreWarnings ?? []), { module: /node_modules\/ox\/_esm\/tempo\// }];
    return config;
  },
  turbopack: {
    root: __dirname,
    resolveAlias: Object.fromEntries(optional.map((m) => [m, "./src/lib/empty.ts"])),
  },
};

export default nextConfig;

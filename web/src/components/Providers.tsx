"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { useEffect, useState, type ReactNode } from "react";
import { WagmiProvider, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, getDefaultConfig, lightTheme } from "@rainbow-me/rainbowkit";
import { BRAND, baseChain } from "@/lib/config";
import type { Apy } from "@/lib/apy";

const config = getDefaultConfig({
  appName: BRAND.name,
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "levada-dev",
  chains: [baseChain],
  transports: { [baseChain.id]: http() },
  ssr: true,
});

const kit = { accentColor: "#3B63F2", accentColorForeground: "#FFFFFF", borderRadius: "none", overlayBlur: "none" } as const;

/** Follows <html data-theme>, which the theme toggle and the system setting drive. */
function useThemeMode() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setMode(el.dataset.theme === "dark" ? "dark" : "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return mode;
}

export function Providers({ children, apy }: { children: ReactNode; apy: Apy }) {
  const [queryClient] = useState(() => {
    const qc = new QueryClient();
    qc.setQueryData(["apy"], apy);
    return qc;
  });
  const mode = useThemeMode();
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={baseChain}
          modalSize="compact"
          theme={mode === "dark" ? darkTheme(kit) : lightTheme(kit)}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

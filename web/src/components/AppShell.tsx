"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NETWORK, chainNames } from "@/lib/config";
import { Connect } from "./Connect";
import { Lockup } from "./Lockup";
import { TokenPair } from "./Token";

const TABS = [
  { href: "/app", label: "Save" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/status", label: "Status" },
];

/** The app's frame: brand back to the landing page, the three app tabs, network and wallet. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="app">
      <div className="grain" aria-hidden="true" />
      <div className="app__glow" aria-hidden="true" />
      <header className="appbar">
        <div className="appbar__in">
          <Link className="appbar__brand" href="/" aria-label="Levada, home">
            <Lockup size={28} />
          </Link>
          <nav className="appbar__tabs" aria-label="App">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href} className="appbar__tab" aria-current={path === t.href ? "page" : undefined}>
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="appbar__right">
            {NETWORK === "testnet" && (
              <span className="chip chip--sm" title={`Levada runs on ${chainNames.base} and ${chainNames.mezo}`}>
                <TokenPair a="base" b="mezo" size={16} /> Testnet
              </span>
            )}
            <Connect />
          </div>
        </div>
      </header>
      <main className="app__main">{children}</main>
      <footer className="app__foot">
        <span>Every keeper step is permissionless: anyone can run it.</span>
        <span>
          <Link href="/">Levada</Link> ·{" "}
          <a href="https://github.com/Nuel-osas/levada" target="_blank" rel="noreferrer">
            Code ↗
          </a>{" "}
          · Not affiliated with Mezo, Base or Wormhole.
        </span>
      </footer>
    </div>
  );
}

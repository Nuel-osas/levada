import type { Metadata } from "next";
import Link from "next/link";
import { Lockup } from "@/components/Lockup";
import { StatusBoard } from "@/components/StatusBoard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BRAND, NETWORK } from "@/lib/config";
import { getStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Status · ${BRAND.name}`,
  description: "Live checks on both chains, Levada's vault and hub, the keeper and the data feeds.",
};

/** Don't trust the keeper, check it: live checks on both chains, the contracts, the keeper and the data feeds. */
export default async function StatusPage() {
  const status = await getStatus();
  return (
    <>
      <header className="top top--static">
        <div className="container top__in">
          <Link className="top__brand" href="/" aria-label="Levada, home">
            <Lockup size={30} />
          </Link>
          <nav className="top__nav top__nav--always" aria-label="Pages">
            <Link href="/">← Back to Levada</Link>
          </nav>
          <div className="top__right">
            {NETWORK === "testnet" && <span className="chip chip--sm">Testnet</span>}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="status container">
        <StatusBoard initial={status} />
      </main>
      <footer className="foot foot--slim">
        <div className="container foot__base">
          <span>Every keeper step is permissionless: anyone can run it.</span>
          <span>Not affiliated with Mezo, Base or Wormhole.</span>
        </div>
      </footer>
    </>
  );
}

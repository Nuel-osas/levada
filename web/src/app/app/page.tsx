import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { Balance } from "@/components/Balance";
import { HeroTry } from "@/components/Faucet";
import { Flow } from "@/components/Flow";
import { HeroStats } from "@/components/HeroCard";
import { RateSource } from "@/components/HeroRate";
import { SavePanel } from "@/components/SavePanel";
import { BRAND } from "@/lib/config";

export const revalidate = 600;

export const metadata: Metadata = {
  title: `Save · ${BRAND.name}`,
  description: "Deposit MUSD on Base and earn Mezo's MUSD Savings Rate. Withdraw any time.",
};

/** The dApp: save and withdraw on the right, the live numbers on the left, the vault's flows below. */
export default function AppPage() {
  return (
    <AppShell>
      <header className="apphead">
        <p className="eyebrow">Save</p>
        <h1 className="apphead__title">
          Earn Mezo&apos;s rate, <em>on Base.</em>
        </h1>
        <HeroTry />
      </header>
      <HeroStats />
      <div className="save save--app" id="save">
        <div className="save__panel" id="withdraw">
          <SavePanel />
        </div>
        <div className="save__balance">
          <Balance />
        </div>
      </div>
      <p className="app__source">
        <RateSource />
      </p>
      <Flow />
    </AppShell>
  );
}

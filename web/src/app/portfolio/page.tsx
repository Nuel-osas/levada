import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { Portfolio } from "@/components/Portfolio";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = {
  title: `Portfolio · ${BRAND.name}`,
  description: "Your Levada savings, earnings and withdrawals.",
};

export default function PortfolioPage() {
  return (
    <AppShell>
      <Portfolio />
    </AppShell>
  );
}

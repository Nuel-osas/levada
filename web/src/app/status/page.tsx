import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { StatusBoard } from "@/components/StatusBoard";
import { BRAND } from "@/lib/config";
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
    <AppShell>
      <StatusBoard initial={status} />
    </AppShell>
  );
}

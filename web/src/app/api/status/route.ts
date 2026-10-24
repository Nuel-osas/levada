import { NextResponse } from "next/server";
import { getStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

/** Live checks on both chains, the vault and hub, the keeper and the data feeds, for people and for other apps. */
export async function GET() {
  return NextResponse.json(await getStatus(), { headers: { "cache-control": "public, max-age=15, s-maxage=15" } });
}

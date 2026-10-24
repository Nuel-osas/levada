import { NextResponse } from "next/server";
import { getMarket } from "@/lib/market";

export const revalidate = 120;

/** Live Mezo mainnet figures: MUSD supply on Base (Base RPC) and BTC, MUSD and MEZO prices (DefiLlama). */
export async function GET() {
  return NextResponse.json(await getMarket());
}

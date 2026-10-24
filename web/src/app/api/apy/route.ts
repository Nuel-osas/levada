import { NextResponse } from "next/server";
import { getApy } from "@/lib/apy";

export const revalidate = 600;

/** Mezo's MUSD Savings Rate, from DefiLlama's index of the sMUSD vault. */
export async function GET() {
  return NextResponse.json(await getApy());
}

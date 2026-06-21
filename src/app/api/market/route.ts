import { NextResponse } from "next/server";
import { getMarkets } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Active market localization config (currency, locales, categories). */
export async function GET() {
  return NextResponse.json({ ok: true, markets: getMarkets() });
}

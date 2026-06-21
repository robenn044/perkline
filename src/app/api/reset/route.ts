import { NextResponse } from "next/server";
import { logAudit, resetStore, SYSTEM_ACTOR } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Restores the pristine seed state for repeated judging cycles. */
export async function POST() {
  resetStore();
  logAudit(SYSTEM_ACTOR, "demo_reset", "Demo data reset to the seeded baseline.");
  return NextResponse.json({ ok: true });
}

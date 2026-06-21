import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rewardsPayoutsEnabled } from "@/lib/feature-flags";
import { approveAndProcessPayout, getPayout } from "@/lib/store";
import { isSameOrigin, rateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** finance_admin approves + settles a payout through the provider adapter. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!rewardsPayoutsEnabled()) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  const session = await getSession();
  if (!session || session.role !== "finance_admin") {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Bad origin." }, { status: 403 });

  // Company-scope check: finance can only act on their own company's payouts.
  const existing = getPayout(params.id);
  if (existing && existing.companyId !== session.companyId) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  const rl = rateLimit(`payout-process:${session.sub}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts, slow down." }, { status: 429 });

  const result = await approveAndProcessPayout(params.id, { userId: session.sub, name: session.name, role: "finance_admin" });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, payout: result.payout, pending: result.pending ?? false });
}

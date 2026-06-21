import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rewardsPayoutsEnabled } from "@/lib/feature-flags";
import { verifyPayoutMethod } from "@/lib/store";
import { isSameOrigin, rateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resolve the mock verification challenge for an employee-owned method. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!rewardsPayoutsEnabled()) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  const session = await getSession();
  if (!session || session.role !== "employee" || !session.employeeId) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Bad origin." }, { status: 403 });
  // Verification is sensitive — rate limit per user.
  const rl = rateLimit(`verify:${session.sub}`, 8, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts, slow down." }, { status: 429 });

  const result = verifyPayoutMethod(session.employeeId, params.id, {
    userId: session.sub,
    name: session.name,
    role: "employee",
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, method: result.method });
}

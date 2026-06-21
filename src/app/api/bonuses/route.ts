import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rewardsPayoutsEnabled } from "@/lib/feature-flags";
import { createBonusCampaign } from "@/lib/store";
import { createBonusSchema } from "@/lib/validation";
import { isSameOrigin, rateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** company_admin creates a bonus campaign → payouts enter finance review. */
export async function POST(req: Request) {
  if (!rewardsPayoutsEnabled()) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  const session = await getSession();
  if (!session || session.role !== "company_admin") {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Bad origin." }, { status: 403 });
  const rl = rateLimit(`bonus-create:${session.sub}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts, slow down." }, { status: 429 });

  const parsed = createBonusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid bonus details." }, { status: 400 });
  }
  const result = createBonusCampaign(session.companyId, parsed.data, {
    userId: session.sub,
    name: session.name,
    role: "company_admin",
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, campaign: result.campaign });
}

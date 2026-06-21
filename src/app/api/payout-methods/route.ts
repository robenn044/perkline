import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rewardsPayoutsEnabled } from "@/lib/feature-flags";
import { addPayoutMethod, getPayoutMethods } from "@/lib/store";
import { addPayoutMethodSchema } from "@/lib/validation";
import { isSameOrigin, rateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const moduleDisabled = () => NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

export async function GET() {
  if (!rewardsPayoutsEnabled()) return moduleDisabled();
  const session = await getSession();
  if (!session?.employeeId) return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  return NextResponse.json({ ok: true, methods: getPayoutMethods(session.employeeId) });
}

export async function POST(req: Request) {
  if (!rewardsPayoutsEnabled()) return moduleDisabled();
  const session = await getSession();
  if (!session || session.role !== "employee" || !session.employeeId) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Bad origin." }, { status: 403 });
  const rl = rateLimit(`payout-method:${session.sub}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts, slow down." }, { status: 429 });

  const parsed = addPayoutMethodSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payout details." }, { status: 400 });
  }
  const result = addPayoutMethod(session.employeeId, parsed.data, {
    userId: session.sub,
    name: session.name,
    role: "employee",
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, method: result.method });
}

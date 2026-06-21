import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updatePolicy } from "@/lib/store";
import { policySchema } from "@/lib/validation";
import { isSameOrigin, rateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Company admin updates the benefit policy for their own company. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "company_admin") {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }
  const rate = rateLimit(`policy:${session.sub}`, 12, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ ok: false, error: "Too many policy updates." }, { status: 429 });
  }
  const parsed = policySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid policy values." }, { status: 400 });
  }
  const policy = updatePolicy(session.companyId, parsed.data, {
    userId: session.sub,
    name: session.name,
    role: "company_admin",
  });
  if (!policy) return NextResponse.json({ ok: false, error: "Policy not found." }, { status: 404 });
  return NextResponse.json({ ok: true, policy });
}

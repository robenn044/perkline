import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rewardsPayoutsEnabled } from "@/lib/feature-flags";
import { removePayoutMethod, setDefaultPayoutMethod, setPayoutMethodDisabled } from "@/lib/store";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const moduleDisabled = () => NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!rewardsPayoutsEnabled()) return moduleDisabled();
  const session = await getSession();
  if (!session?.employeeId) return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Bad origin." }, { status: 403 });
  const ok = removePayoutMethod(session.employeeId, params.id, {
    userId: session.sub,
    name: session.name,
    role: "employee",
  });
  return NextResponse.json({ ok });
}

/** action: "default" (set default) | "disable" | "enable". */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!rewardsPayoutsEnabled()) return moduleDisabled();
  const session = await getSession();
  if (!session?.employeeId) return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Bad origin." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  if (body.action === "disable" || body.action === "enable") {
    const ok = setPayoutMethodDisabled(session.employeeId, params.id, body.action === "disable");
    return NextResponse.json({ ok });
  }
  const ok = setDefaultPayoutMethod(session.employeeId, params.id);
  return NextResponse.json({ ok, error: ok ? undefined : "Method must be verified and enabled first." });
}

import { NextResponse } from "next/server";
import { runConcierge } from "@/lib/ai-client";
import { getSession } from "@/lib/auth";
import {
  getEmployee,
  getCuratedPackages,
  getOffers,
  getPolicy,
  getProviders,
  getQuestionnaire,
} from "@/lib/store";
import { isSameOrigin, rateLimit } from "@/lib/security";
import { conciergeSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Turns a natural-language prompt into a validated, policy-checked package. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "employee" || !session.employeeId) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }
  const rate = rateLimit(`perx-match:${session.sub}`, 30, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ ok: false, error: "Too many match requests. Try again shortly." }, { status: 429 });
  }

  const parsed = conciergeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Tell me what you're in the mood for." }, { status: 400 });
  }

  const employee = getEmployee(session.employeeId);
  if (!employee) {
    return NextResponse.json({ ok: false, error: "Employee not found." }, { status: 404 });
  }
  const policy = getPolicy(employee.companyId);
  if (!policy) {
    return NextResponse.json({ ok: false, error: "No employer policy configured." }, { status: 500 });
  }

  const result = await runConcierge(
    parsed.data.prompt,
    employee,
    policy,
    getOffers(),
    getProviders(),
    getQuestionnaire(employee.id),
    getCuratedPackages(),
  );
  return NextResponse.json({ ok: true, result });
}

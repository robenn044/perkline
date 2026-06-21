import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { approveRequest, getRequest } from "@/lib/store";
import { decisionSchema } from "@/lib/validation";
import { isSameOrigin, rateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "company_admin") {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }
  const rate = rateLimit(`request-approve:${session.sub}`, 30, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ ok: false, error: "Too many decisions. Try again shortly." }, { status: 429 });
  }
  // Authorization: admins may only act on their own company's requests.
  const existing = getRequest(params.id);
  if (existing && existing.companyId !== session.companyId) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const parsed = decisionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid approval note." }, { status: 400 });
  }
  const comment = parsed.data.comment;

  const result = approveRequest(params.id, { userId: session.sub, name: session.name, role: "company_admin" }, comment);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, request: result.request });
}

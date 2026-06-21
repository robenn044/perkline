import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { approveRequest, getRequest, rejectRequest } from "@/lib/store";
import { isSameOrigin, rateLimit } from "@/lib/security";
import { bulkDecisionSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "company_admin") {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }
  const rate = rateLimit(`request-bulk:${session.sub}`, 10, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ ok: false, error: "Too many bulk decisions." }, { status: 429 });
  }

  const parsed = bulkDecisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid bulk decision." },
      { status: 400 },
    );
  }
  const uniqueIds = Array.from(new Set(parsed.data.requestIds));
  const requests = uniqueIds.map((id) => getRequest(id));
  if (requests.some((request) => !request || request.companyId !== session.companyId)) {
    return NextResponse.json({ ok: false, error: "One or more requests are not available." }, { status: 403 });
  }

  const actor = { userId: session.sub, name: session.name, role: "company_admin" as const };
  const results = uniqueIds.map((id) =>
    parsed.data.action === "approve"
      ? approveRequest(id, actor, parsed.data.comment)
      : rejectRequest(id, actor, parsed.data.comment),
  );
  const failures = results.filter((result) => !result.ok);
  return NextResponse.json({
    ok: failures.length === 0,
    processed: results.length - failures.length,
    failures: failures.map((failure) => failure.error),
  });
}

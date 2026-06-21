import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCompany, getProvider, updateProviderStatus } from "@/lib/store";
import { isSameOrigin, rateLimit } from "@/lib/security";
import { providerStatusSchema } from "@/lib/validation";

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
  const rate = rateLimit(`provider-status:${session.sub}`, 20, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ ok: false, error: "Too many updates." }, { status: 429 });
  }

  const parsed = providerStatusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid provider status." }, { status: 400 });
  }
  const company = getCompany(session.companyId);
  const provider = getProvider(params.id);
  if (!company || !provider || provider.marketId !== company.marketId) {
    return NextResponse.json({ ok: false, error: "Provider is outside your market." }, { status: 403 });
  }
  const updated = updateProviderStatus(params.id, parsed.data.status, {
    userId: session.sub,
    name: session.name,
    role: "company_admin",
  });
  return NextResponse.json({ ok: true, provider: updated });
}

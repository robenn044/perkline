import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getCompany,
  getEmployeePerxWallet,
  getProvider,
  getProviderPaymentDestinations,
  saveProviderPaymentDestination,
} from "@/lib/store";
import { isSameOrigin, rateLimit } from "@/lib/security";
import { providerPaymentDestinationSchema } from "@/lib/validation";
import type { ProviderDestinationDraft } from "@/lib/payment-destination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  if (session.role === "employee" && session.employeeId) {
    return NextResponse.json({
      ok: true,
      destinations: [getEmployeePerxWallet(session.employeeId)].filter(Boolean),
    });
  }
  if (session.role === "company_admin") {
    const company = getCompany(session.companyId);
    const destinations = getProviderPaymentDestinations().filter((destination) => {
      const provider = getProvider(destination.ownerId);
      return provider?.marketId === company?.marketId;
    });
    return NextResponse.json({ ok: true, destinations });
  }
  return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "company_admin") {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }
  const rate = rateLimit(`payment-destination:${session.sub}`, 12, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many destination updates. Try again shortly." },
      { status: 429, headers: { "retry-after": String(rate.retryAfterSec) } },
    );
  }

  const parsed = providerPaymentDestinationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settlement details." },
      { status: 400 },
    );
  }

  const company = getCompany(session.companyId);
  const provider = getProvider(parsed.data.providerId);
  if (!provider || !company || provider.marketId !== company.marketId) {
    return NextResponse.json({ ok: false, error: "Provider is outside your market." }, { status: 403 });
  }

  let input: ProviderDestinationDraft;
  if (parsed.data.type === "provider_bank_settlement") {
    input = {
      type: parsed.data.type,
      legalBusinessName: parsed.data.legalBusinessName,
      country: parsed.data.country,
      currency: parsed.data.currency,
      iban: parsed.data.iban,
      bic: parsed.data.bic ?? "",
    };
  } else if (parsed.data.type === "provider_paypal_business") {
    input = {
      type: parsed.data.type,
      currency: parsed.data.currency,
      verifiedBusinessEmail: parsed.data.verifiedBusinessEmail,
    };
  } else {
    input = { type: parsed.data.type, currency: parsed.data.currency };
  }

  const result = saveProviderPaymentDestination(parsed.data.providerId, input, {
    userId: session.sub,
    name: session.name,
    role: "company_admin",
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, destination: result.destination });
}

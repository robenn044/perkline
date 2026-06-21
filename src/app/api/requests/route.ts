import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { submitRequest } from "@/lib/store";
import { submitRequestSchema } from "@/lib/validation";
import type { Package } from "@/lib/types";
import { isSameOrigin, rateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Employee submits a package (curated or AI-generated) for employer approval. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "employee" || !session.employeeId) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }
  const rate = rateLimit(`request-submit:${session.sub}`, 20, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ ok: false, error: "Too many submissions. Try again shortly." }, { status: 429 });
  }

  const parsed = submitRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }

  const pkg = parsed.data.package as Package;

  const result = submitRequest(session.employeeId, pkg, parsed.data.origin, {
    userId: session.sub,
    name: session.name,
    role: "employee",
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, request: result.request });
}

import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/auth";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { logAudit } from "@/lib/store";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs"; // bcrypt requires the Node runtime
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  // Same generic message for bad input or bad credentials — no user enumeration.
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 400 });
  }

  const session = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  }

  const token = await signSession(session);
  const res = NextResponse.json({ ok: true, role: session.role });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  logAudit({ userId: session.sub, name: session.name, role: session.role }, "login", `Signed in as ${session.email}.`);
  return res;
}

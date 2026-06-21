import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * Route protection + RBAC at the edge. Unauthenticated users hitting a
 * dashboard are sent to /login; authenticated users on the wrong dashboard are
 * redirected to their own. Uses only the edge-safe `session.ts` (jose) — no
 * Node-only deps run here.
 */
const HOME: Record<string, string> = {
  employee: "/employee",
  company_admin: "/admin",
  finance_admin: "/finance",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isEmployee = pathname.startsWith("/employee");
  const isAdmin = pathname.startsWith("/admin");
  const isFinance = pathname.startsWith("/finance");
  if (!isEmployee && !isAdmin && !isFinance) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const home = HOME[session.role] ?? "/employee";
  if (isEmployee && session.role !== "employee") return NextResponse.redirect(new URL(home, req.url));
  if (isAdmin && session.role !== "company_admin") return NextResponse.redirect(new URL(home, req.url));
  if (isFinance && session.role !== "finance_admin") return NextResponse.redirect(new URL(home, req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/employee/:path*", "/admin/:path*", "/finance/:path*"],
};

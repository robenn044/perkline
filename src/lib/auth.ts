import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./session";
import { getUserByEmail } from "./store";
import type { UserRole } from "./types";

/**
 * Server-side auth helpers. Node runtime only (uses bcrypt + the store), so this
 * is never imported by middleware — middleware uses the edge-safe `session.ts`.
 */

export type { SessionPayload };

/** Read & verify the current session from the request cookies. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/** The home dashboard for each role. */
export function roleHome(role: UserRole): string {
  if (role === "company_admin") return "/admin";
  if (role === "finance_admin") return "/finance";
  return "/employee";
}

/** Require any authenticated user, else redirect to login. */
export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Require a specific role; bounce to the caller's own dashboard otherwise. */
export async function requireRole(role: UserRole): Promise<SessionPayload> {
  const session = await requireUser();
  if (session.role !== role) {
    redirect(roleHome(session.role));
  }
  return session;
}

/** Verify email + password against stored bcrypt hashes. */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionPayload | null> {
  const user = getUserByEmail(email.trim().toLowerCase());
  if (!user) return null;
  const ok = await compare(password, user.passwordHash);
  if (!ok) return null;
  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    companyId: user.companyId,
    employeeId: user.employeeId,
    avatarSeed: user.avatarSeed,
  };
}

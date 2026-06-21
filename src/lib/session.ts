import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "./types";

/**
 * Edge-safe session primitives (jose only — no Node-only deps), so this module
 * can be imported by `middleware.ts` which runs in the Edge runtime.
 *
 * The session is a signed JWT (HS256) carried in an httpOnly, SameSite=Lax
 * cookie. This mirrors how Auth.js issues credential/JWT sessions; we keep it
 * self-contained for a zero-config, demo-proof prototype.
 */

export const SESSION_COOKIE = "perx_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  name: string;
  companyId: string;
  employeeId?: string;
  avatarSeed: string;
}

function secretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    // Dev fallback so the app runs with zero config. Set AUTH_SECRET in prod.
    "perx-routes-dev-secret-change-me-in-production-0123456789";
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

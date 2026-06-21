/**
 * Lightweight security helpers for sensitive mutations:
 *  - in-memory fixed-window rate limiting (per key)
 *  - same-origin (CSRF) assertion for cookie-authenticated POSTs
 *
 * Combined with httpOnly + SameSite=Lax cookies and server-side RBAC, these give
 * defense-in-depth without external infrastructure.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __perxRate: Map<string, Bucket> | undefined;
}

function buckets(): Map<string, Bucket> {
  if (!globalThis.__perxRate) globalThis.__perxRate = new Map();
  return globalThis.__perxRate;
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const b = buckets().get(key);
  if (!b || b.resetAt <= now) {
    buckets().set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, retryAfterSec: 0 };
}

/**
 * Assert the request originates from our own site. For cookie-auth POSTs this
 * blocks cross-site form submissions (CSRF). Same-origin fetches always send a
 * matching Origin; if neither Origin nor Referer is present we allow (non-browser
 * tooling / same-origin server calls).
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin) return true; // no Origin header (e.g. same-origin GET-like tools)
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

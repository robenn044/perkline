import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Deterministic id helper for seeds & created records. */
let counter = 0;
export function nid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

/** Build a short, human-readable voucher / redemption code. */
export function voucherCode(seed: string): string {
  const clean = seed.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const a = clean.slice(0, 3).padEnd(3, "X");
  const n = Math.abs(hashString(seed)) % 10000;
  return `PERX-${a}-${n.toString().padStart(4, "0")}`;
}

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Deterministic avatar/identity gradient. Drawn from a curated set of MUTED,
 * harmonious tones (petrol, clay, sage, slate, sand, plum) so a column of people
 * reads as one calm set — distinct but never a saturated rainbow. White
 * initials sit on the darker end for AA contrast.
 */
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, hsl(190 38% 36%), hsl(192 44% 26%))", // petrol
  "linear-gradient(135deg, hsl(26 32% 44%), hsl(22 36% 34%))", // clay
  "linear-gradient(135deg, hsl(150 24% 36%), hsl(156 28% 27%))", // sage
  "linear-gradient(135deg, hsl(218 20% 44%), hsl(220 24% 33%))", // slate
  "linear-gradient(135deg, hsl(40 32% 44%), hsl(34 36% 34%))", // sand / ochre
  "linear-gradient(135deg, hsl(282 16% 44%), hsl(284 20% 33%))", // muted plum
];

export function gradientFromSeed(seed: string): string {
  return AVATAR_GRADIENTS[Math.abs(hashString(seed)) % AVATAR_GRADIENTS.length];
}

/**
 * Curated, brand-cohesive gradients for Collection hero cards. Deterministic by
 * seed but drawn from a designed warm-petrol palette so a row of routes reads as
 * one intentional set — not random rainbow cards.
 */
const ROUTE_GRADIENTS = [
  "linear-gradient(135deg, hsl(192 58% 24%), hsl(196 52% 32%))", // deep petrol
  "linear-gradient(135deg, hsl(200 42% 28%), hsl(180 40% 30%))", // teal → cyan
  "linear-gradient(135deg, hsl(168 38% 26%), hsl(152 34% 30%))", // teal → green
  "linear-gradient(135deg, hsl(28 40% 36%), hsl(20 42% 32%))", // warm clay
  "linear-gradient(135deg, hsl(210 32% 30%), hsl(190 44% 28%))", // slate → teal
  "linear-gradient(135deg, hsl(40 36% 40%), hsl(30 40% 34%))", // sand
];

export function routeGradient(seed: string): string {
  return ROUTE_GRADIENTS[Math.abs(hashString(seed)) % ROUTE_GRADIENTS.length];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

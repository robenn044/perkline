"use client";

import { MotionConfig } from "framer-motion";

/**
 * Globally honor the user's "reduce motion" OS setting for all framer-motion
 * animations. `children` are passed through untouched, so Server Components
 * nested inside stay server-rendered (this only provides motion context).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

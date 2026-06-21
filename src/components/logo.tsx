import { cn } from "@/lib/utils";

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative inline-flex h-8 w-8 items-center justify-center">
        <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
          <defs>
            <linearGradient id="perxLogo" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(192 60% 26%)" />
              <stop offset="100%" stopColor="hsl(186 52% 40%)" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#perxLogo)" />
          {/* Upward route: a path climbing from a start node to a destination pin */}
          <path
            d="M9 23 C 13 23, 12 14, 16 14 S 22 11, 23 8"
            fill="none"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="0.1 4.6"
          />
          <circle cx="9" cy="23" r="2.4" fill="white" />
          <circle cx="23" cy="9" r="3" fill="white" />
          <circle cx="23" cy="9" r="1.2" fill="url(#perxLogo)" />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-[15px] font-bold tracking-tight">
          Perk<span className="text-primary">line</span>
        </span>
      )}
    </span>
  );
}

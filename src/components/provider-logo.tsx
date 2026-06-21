import { cn, gradientFromSeed, initials } from "@/lib/utils";

export function ProviderLogo({
  name,
  seed,
  size = 44,
  className,
  rounded = "rounded-xl",
}: {
  name: string;
  seed?: string;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center font-bold text-white shadow-soft", rounded, className)}
      style={{ width: size, height: size, fontSize: size * 0.34, background: gradientFromSeed(seed || name) }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

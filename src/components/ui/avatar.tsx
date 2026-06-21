import { cn, gradientFromSeed, initials } from "@/lib/utils";

export function Avatar({
  name,
  seed,
  className,
  size = 40,
}: {
  name: string;
  seed?: string;
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-soft ring-2 ring-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: gradientFromSeed(seed || name),
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

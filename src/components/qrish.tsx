import { hashString } from "@/lib/utils";

/**
 * Deterministic QR-style code art derived from a string. Not a scannable QR —
 * a tasteful, stable placeholder for the redemption pass that looks the part in
 * the demo without pulling in a QR dependency.
 */
export function Qrish({ value, size = 116 }: { value: string; size?: number }) {
  const grid = 11;
  const cells: boolean[] = [];
  for (let i = 0; i < grid * grid; i++) {
    const h = hashString(`${value}:${i}:${(i * 7) % 13}`);
    cells.push((Math.abs(h) % 100) > 48);
  }
  // Force finder-pattern corners for a recognizable QR silhouette.
  const corners = [
    [0, 0],
    [0, grid - 3],
    [grid - 3, 0],
  ];
  function inFinder(r: number, c: number) {
    return corners.some(([fr, fc]) => {
      const dr = r - fr;
      const dc = c - fc;
      if (dr < 0 || dr > 2 || dc < 0 || dc > 2) return false;
      return dr === 0 || dr === 2 || dc === 0 || dc === 2 || (dr === 1 && dc === 1);
    });
  }

  return (
    <div
      className="grid overflow-hidden rounded-lg bg-white p-1.5 shadow-soft ring-1 ring-border"
      style={{ width: size, height: size, gridTemplateColumns: `repeat(${grid}, 1fr)`, gap: 1 }}
      aria-hidden
    >
      {cells.map((on, i) => {
        const r = Math.floor(i / grid);
        const c = i % grid;
        const filled = inFinder(r, c) || on;
        return <div key={i} className={filled ? "bg-foreground" : "bg-transparent"} style={{ borderRadius: 1 }} />;
      })}
    </div>
  );
}

import { CATEGORY_META, type SourceCategory } from "@/data/sources";

/**
 * Deterministic, horizontally-symmetric pixel mosaic — a generative "sigil"
 * for articles with no thumbnail. Seeded by the article id so the same
 * article always renders the same pattern; symmetric so it reads as designed
 * rather than noise. Colored in the article's category hue.
 *
 * Replaces the old faded-favicon placeholder. Pure + deterministic (no hooks),
 * so it renders fine on the server or inside a client component.
 */

const GRID = 9; // 9×9, odd so there's a clean center column under mirroring.

function hashString(s: string): number {
  // FNV-1a → 32-bit seed.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Build the list of filled cells. Kept as a pure module-level helper (rather
 * than a closure mutated during render) so the PRNG state churn doesn't trip
 * the react-hooks immutability rule.
 */
function buildCells(seed: string): { x: number; y: number }[] {
  let state = hashString(seed) || 0x9e3779b9;
  const next = () => {
    // xorshift32
    state ^= (state << 13) >>> 0;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= (state << 5) >>> 0;
    state >>>= 0;
    return state >>> 0;
  };

  const half = Math.ceil(GRID / 2);
  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < half; c++) {
      // ~52% fill, a touch denser toward the center column.
      const on = next() % 100 < (c === half - 1 ? 62 : 50);
      if (!on) continue;
      cells.push({ x: c, y: r });
      const mirror = GRID - 1 - c;
      if (mirror !== c) cells.push({ x: mirror, y: r });
    }
  }
  return cells;
}

export function PixelMosaic({
  seed,
  category,
  className = "",
}: {
  seed: string;
  category: SourceCategory;
  className?: string;
}) {
  const color = CATEGORY_META[category].dotVar;
  const cells = buildCells(seed);

  return (
    <svg
      viewBox={`0 0 ${GRID} ${GRID}`}
      className={className}
      shapeRendering="crispEdges"
      fill={color}
      aria-hidden
    >
      {cells.map((cell) => (
        <rect
          key={`${cell.x}-${cell.y}`}
          x={cell.x}
          y={cell.y}
          width="1.02"
          height="1.02"
        />
      ))}
    </svg>
  );
}

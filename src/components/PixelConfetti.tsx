/**
 * Floating pixel confetti — a fixed, behind-everything layer of small colored
 * squares drifting slowly. Pure CSS (no JS, no hooks): a fixed set of squares
 * with per-square position / color / duration so it's deterministic and cheap.
 * Sits at z-index -1 so it shows only in the gaps between opaque cards.
 * Opacity is theme-driven (--confetti-opacity); hidden entirely under
 * prefers-reduced-motion (see globals.css).
 */
const COLORS = [
  "var(--color-lime)",
  "var(--color-hot)",
  "var(--color-cyan)",
  "var(--color-accent)",
  "var(--color-amber)",
];

// [left%, topvh, sizePx, colorIdx, durationS, delayS]
const SQUARES: [number, number, number, number, number, number][] = [
  [6, 12, 9, 0, 46, 0], [16, 70, 7, 2, 58, 3], [27, 30, 12, 1, 40, 6],
  [38, 85, 8, 3, 52, 1], [47, 18, 9, 4, 62, 4], [58, 55, 10, 0, 44, 2],
  [66, 8, 7, 2, 56, 7], [74, 78, 9, 1, 48, 5], [83, 36, 12, 3, 60, 0],
  [92, 64, 8, 4, 42, 3], [11, 46, 9, 1, 54, 8], [34, 60, 7, 0, 50, 2],
  [52, 90, 10, 2, 64, 6], [70, 44, 9, 4, 46, 1], [88, 16, 8, 3, 58, 4],
  [22, 92, 9, 0, 50, 9],
];

export function PixelConfetti() {
  return (
    <div className="confetti-layer" aria-hidden>
      {SQUARES.map(([left, top, size, colorIdx, dur, delay], i) => (
        <span
          key={i}
          className="confetti-px"
          style={{
            left: `${left}%`,
            top: `${top}vh`,
            width: `${size}px`,
            height: `${size}px`,
            background: COLORS[colorIdx],
            animationDuration: `${dur}s`,
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  );
}

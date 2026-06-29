"use client";

import { useState } from "react";

/**
 * A dynamic pixel "Rorschach": a bilaterally-symmetric inkblot (left cells
 * mirrored to the right) that shimmers/morphs while loading — each mirrored
 * cell-pair shares a timing so symmetry is preserved as cells fade + scale.
 * Color follows --color-accent. Used by the pull-to-refresh bar AND the edition
 * bottom sheet's loading state, so both show the same "Designator is thinking"
 * animation.
 *
 * `loading` drives the shimmer; when false the blot is static and `opacity`
 * just ramps it in (the pull-to-refresh uses this for the drag ramp).
 */
const ROR_W = 14;
const ROR_H = 11;

export function PixelLoader({
  loading,
  opacity,
}: {
  loading: boolean;
  opacity: number;
}) {
  // Generated once per mount (lazy init, off the render path) so every mount
  // produces a fresh blot.
  const [cells] = useState(() => {
    const half = ROR_W / 2;
    const out: { x: number; y: number; dur: string; delay: string }[] = [];
    for (let y = 0; y < ROR_H; y++) {
      for (let x = 0; x < half; x++) {
        const cx = x / (half - 1); // 0 at outer edge → 1 at center
        const cy = 1 - Math.abs(y - (ROR_H - 1) / 2) / ((ROR_H - 1) / 2);
        const p = 0.1 + 0.6 * cx * Math.max(cy, 0) + 0.18 * Math.max(cy, 0);
        if (Math.random() < p) {
          out.push({
            x,
            y,
            // Fast, snappy shimmer.
            dur: (0.3 + Math.random() * 0.45).toFixed(2),
            delay: (Math.random() * 0.35).toFixed(2),
          });
        }
      }
    }
    return out;
  });

  return (
    <svg
      viewBox={`0 0 ${ROR_W} ${ROR_H}`}
      className="h-12 w-auto"
      style={{ color: "var(--color-accent)", opacity }}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {cells.flatMap(({ x, y, dur, delay }, i) => {
        const style = loading
          ? { animationDuration: `${dur}s`, animationDelay: `${delay}s` }
          : undefined;
        const cls = loading ? "ror-cell" : undefined;
        return [
          <rect key={`l${i}`} x={x} y={y} width="1.05" height="1.05" fill="currentColor" className={cls} style={style} />,
          <rect key={`r${i}`} x={ROR_W - 1 - x} y={y} width="1.05" height="1.05" fill="currentColor" className={cls} style={style} />,
        ];
      })}
    </svg>
  );
}

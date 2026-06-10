"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Mobile pull-to-refresh with a pixel T-rex.
 *
 * Touch-only. On touch devices scrolling lives in #app-scroll (not the
 * document), so the browser's native pull-to-refresh never fires and we own
 * the gesture. A *deep, intentional* downward pull at the top (THRESHOLD) is
 * required; on release we show the bobbing dino briefly, then do a real
 * window.location.reload() — an unmistakable refresh (the skeleton loader
 * shows while it reloads), rather than a soft refetch that looks like nothing
 * happened when the feed hasn't changed.
 *
 * The dino renders /dino.png if present (drop your exact art there) and falls
 * back to a built-in green pixel T-rex otherwise.
 */
const THRESHOLD = 88; // deep, intentional pull (post-resistance px)
const MAX = 132;
const HOLD_MS = 850; // show the dino this long before reloading

export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const startY = useRef<number | null>(null);
  const busyRef = useRef(false);

  const triggerRefresh = useCallback(() => {
    busyRef.current = true;
    setRefreshing(true);
    window.setTimeout(() => window.location.reload(), HOLD_MS);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const sc = document.getElementById("app-scroll");
    const scrollTop = () => (sc ? sc.scrollTop : window.scrollY);
    const target: HTMLElement | Window = sc ?? window;

    const set = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };

    const onStart = (e: TouchEvent) => {
      if (scrollTop() > 0 || busyRef.current) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null || busyRef.current) return;
      if (scrollTop() > 0) {
        startY.current = null;
        set(0);
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        set(0);
        return;
      }
      set(Math.min(MAX, dy * 0.55));
      if (pullRef.current > 4 && e.cancelable) e.preventDefault();
    };
    const onEnd = () => {
      if (startY.current == null) return;
      const reached = pullRef.current >= THRESHOLD;
      startY.current = null;
      set(0);
      if (reached && !busyRef.current) triggerRefresh();
    };

    target.addEventListener("touchstart", onStart as EventListener, { passive: true });
    target.addEventListener("touchmove", onMove as EventListener, { passive: false });
    target.addEventListener("touchend", onEnd as EventListener, { passive: true });
    target.addEventListener("touchcancel", onEnd as EventListener, { passive: true });
    return () => {
      target.removeEventListener("touchstart", onStart as EventListener);
      target.removeEventListener("touchmove", onMove as EventListener);
      target.removeEventListener("touchend", onEnd as EventListener);
      target.removeEventListener("touchcancel", onEnd as EventListener);
    };
  }, [triggerRefresh]);

  const height = refreshing ? 96 : pull;
  if (height <= 0) return null;

  return (
    <div className="ptr-bar" style={{ height }} aria-hidden>
      <PixelLoader
        loading={refreshing}
        opacity={refreshing ? 1 : Math.min(1, pull / THRESHOLD)}
      />
    </div>
  );
}

/**
 * A dynamic pixel "Rorschach": a bilaterally-symmetric inkblot (left cells
 * mirrored to the right) that shimmers/morphs while loading — each mirrored
 * cell-pair shares a timing so symmetry is preserved as cells fade + scale.
 * Ink color is theme-aware (dark blot on the light bar, light on the dark
 * bar). During the pull the blot is static and just ramps in opacity.
 */
const ROR_W = 14;
const ROR_H = 11;

function PixelLoader({ loading, opacity }: { loading: boolean; opacity: number }) {
  // Generated once per mount (lazy init, off the render path) so every pull
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
      style={{ color: "var(--color-ink)", opacity }}
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

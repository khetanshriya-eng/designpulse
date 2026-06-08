"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Mobile pull-to-refresh with a pixel T-rex that breathes fire once you pull
 * past the threshold. Touch-only (skips on fine pointers). At scroll-top, a
 * downward drag grows a top bar with the dino; releasing past the threshold
 * fires router.refresh() (re-runs server components → fresh feed) while the
 * dino flames until it completes.
 *
 * Native browser pull-to-refresh is suppressed via overscroll-behavior-y on
 * the body (globals.css) plus preventDefault while we're actively pulling.
 */
const THRESHOLD = 64;
const MAX = 96;

export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [pending, startTransition] = useTransition();
  const pullRef = useRef(0);
  const startY = useRef<number | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const set = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };

    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || pendingRef.current) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      if (window.scrollY > 0) {
        startY.current = null;
        set(0);
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        set(0);
        return;
      }
      set(Math.min(MAX, dy * 0.5)); // resistance
      if (pullRef.current > 2 && e.cancelable) e.preventDefault();
    };
    const onEnd = () => {
      if (startY.current == null) return;
      const reached = pullRef.current >= THRESHOLD;
      startY.current = null;
      set(0);
      if (reached && !pendingRef.current) {
        startTransition(() => router.refresh());
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router, startTransition]);

  const height = pending ? 76 : pull;
  if (height <= 0) return null;
  const firing = pending || pull >= THRESHOLD;

  return (
    <div className="ptr-bar" style={{ height }} aria-hidden>
      <DinoFlame firing={firing} opacity={pending ? 1 : Math.min(1, pull / THRESHOLD)} />
    </div>
  );
}

// Pixel T-rex facing right ('#' = body). Fire jets from the mouth when firing.
const DINO = [
  "..........#####.",
  "..........#.###.",
  "..........#####.",
  "..........#####.",
  "#.........####..",
  "##.......#####..",
  "###....#######..",
  ".#############..",
  "..############..",
  "...##########...",
  "...##.####.##...",
  "...##.###..##...",
  "...#..#....#....",
];

// [x, y, color] flame pixels to the right of the mouth.
const FIRE: [number, number, string][] = [
  [15, 2, "#ffd23f"], [16, 2, "#ff8a00"],
  [15, 3, "#ff8a00"], [16, 3, "#ffd23f"], [17, 3, "#ff3b1f"],
  [15, 4, "#ffd23f"], [16, 4, "#ff3b1f"], [18, 3, "#ff3b1f"],
];

function DinoFlame({ firing, opacity }: { firing: boolean; opacity: number }) {
  return (
    <svg
      viewBox="0 0 20 13"
      className="h-11 w-auto"
      style={{ color: "var(--color-ink)", opacity }}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {DINO.flatMap((row, y) =>
        row.split("").map((c, x) =>
          c === "#" ? (
            <rect key={`d-${x}-${y}`} x={x} y={y} width="1.05" height="1.05" fill="currentColor" />
          ) : null
        )
      )}
      <g className={`ptr-fire${firing ? " on" : ""}`} style={{ opacity: firing ? 1 : 0 }}>
        {FIRE.map(([x, y, fill], i) => (
          <rect key={`f-${i}`} x={x} y={y} width="1.05" height="1.05" fill={fill} />
        ))}
      </g>
    </svg>
  );
}

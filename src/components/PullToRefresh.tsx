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

    // On touch devices the scroll lives in #app-scroll, not the document.
    const sc = document.getElementById("app-scroll");
    const scrollTop = () => (sc ? sc.scrollTop : window.scrollY);
    const target: HTMLElement | Window = sc ?? window;

    const set = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };

    const onStart = (e: TouchEvent) => {
      if (scrollTop() > 0 || pendingRef.current) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null) return;
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

// Pixel T-rex facing right ('#' = body). 18 wide: tail (left), body, raised
// neck + head with an eye notch (right), two legs, a little arm. Fire jets
// from the mouth when firing.
const DINO = [
  "..............####.",
  ".............#####.",
  ".............##.##.",  // eye notch
  ".............#####.",
  ".............#####.",
  "###..........#####.",  // tail tip + head
  ".####.......######.",
  "..#####....#######.",
  "...###############.",  // back
  "....##############.",
  "....##############.",
  "....#####.#######..",  // arm notch
  "....##############.",
  "....#############..",
  "....####....####...",  // two legs
  "....###.....###....",
  "....##......###....",
  "...###......####...",  // feet
];

// [x, y, color] flame pixels jetting right from the mouth.
const FIRE: [number, number, string][] = [
  [18, 3, "#ffd23f"], [18, 4, "#ff8a00"], [19, 4, "#ffd23f"],
  [18, 5, "#ff8a00"], [19, 5, "#ff3b1f"], [20, 4, "#ff3b1f"],
  [18, 6, "#ffd23f"], [19, 6, "#ff8a00"], [20, 5, "#ff3b1f"], [21, 5, "#ff3b1f"],
];

function DinoFlame({ firing, opacity }: { firing: boolean; opacity: number }) {
  return (
    <svg
      viewBox="0 0 23 18"
      className="h-12 w-auto"
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

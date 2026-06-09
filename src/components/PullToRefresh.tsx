"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Mobile pull-to-refresh with an animated pixel T-rex that breathes fire while
 * the feed refreshes. Touch-only.
 *
 * Why it now behaves like a real loader:
 *  - On touch devices scrolling lives in #app-scroll (not the document), so
 *    the browser's native pull-to-refresh never fires and we own the gesture.
 *  - On release past the threshold we run router.refresh() AND hold the loader
 *    for a minimum duration, so even an instant refresh shows a clear, animated
 *    loading state (bobbing dino + billowing fire + pulsing dots) instead of a
 *    flash.
 */
const THRESHOLD = 64;
const MAX = 96;
const MIN_VISIBLE_MS = 1100;

export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, startTransition] = useTransition();
  const pullRef = useRef(0);
  const startY = useRef<number | null>(null);
  const busyRef = useRef(false); // refreshing || pending, for touch handlers

  useEffect(() => {
    busyRef.current = refreshing || pending;
  }, [refreshing, pending]);

  const triggerRefresh = useCallback(() => {
    setRefreshing(true);
    startTransition(() => router.refresh());
    window.setTimeout(() => setRefreshing(false), MIN_VISIBLE_MS);
  }, [router]);

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

  const loading = refreshing || pending;
  const height = loading ? 88 : pull;
  if (height <= 0) return null;

  const ready = pull >= THRESHOLD; // armed but not yet released
  return (
    <div className="ptr-bar" style={{ height }} aria-hidden>
      <div className="flex flex-col items-center gap-1.5">
        <Dino
          loading={loading}
          firing={loading || ready}
          opacity={loading ? 1 : Math.min(1, pull / THRESHOLD)}
        />
        {loading && (
          <div className="flex gap-1.5">
            <span className="ptr-dot" />
            <span className="ptr-dot" />
            <span className="ptr-dot" />
          </div>
        )}
      </div>
    </div>
  );
}

// Pixel T-rex facing right ('#' = body). Bobs while loading; fire billows.
const DINO = [
  ".........######",
  ".........######",
  ".........##.###", // eye notch
  ".........######",
  ".........#####.",
  "##.......######", // tail tip + head; mouth opens to the right
  ".####...#######",
  "..############.",
  "...###########.",
  "...###########.",
  "...######.####.", // arm notch
  "...###########.",
  "...##.....###..", // legs
  "...##.....##...",
  "..###.....###..", // feet
];

// [x, y, color] flame jetting right from the mouth.
const FIRE: [number, number, string][] = [
  [15, 4, "#ffd23f"], [15, 5, "#ff8a00"], [16, 5, "#ffd23f"],
  [15, 6, "#ff8a00"], [16, 6, "#ff3b1f"], [17, 5, "#ff3b1f"],
  [16, 4, "#ffd23f"], [17, 6, "#ff3b1f"], [18, 5, "#ff3b1f"],
];

function Dino({
  loading,
  firing,
  opacity,
}: {
  loading: boolean;
  firing: boolean;
  opacity: number;
}) {
  return (
    <svg
      viewBox="0 0 20 15"
      className={`h-12 w-auto${loading ? " dino-bob" : ""}`}
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

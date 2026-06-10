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
 * A row of chunky pixel blocks that bounce in a staggered wave while loading
 * (an arcade-loader feel). Uses the vivid category colors so it reads clearly
 * on both the light and dark theme bars. During the pull they're static and
 * just ramp in opacity.
 */
const BLOCK_COLORS = [
  "var(--color-lime)",
  "var(--color-cyan)",
  "var(--color-hot)",
  "var(--color-amber)",
];

function PixelLoader({ loading, opacity }: { loading: boolean; opacity: number }) {
  return (
    <div className="flex items-end gap-2" style={{ opacity }}>
      {BLOCK_COLORS.map((c, i) => (
        <span
          key={i}
          className={`pix-block${loading ? " run" : ""}`}
          style={{ background: c, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "designator-theme";

/**
 * Manual theme override layered on top of the server's geo sunrise/sunset
 * pick. The server renders <html data-theme> (effective) and data-auto-theme
 * (the geo pick); a tiny pre-paint script in the layout applies any saved
 * override before first paint. This button just flips data-theme + persists.
 *
 *   click        → toggle light/dark (persisted)
 *   double-click → clear override, snap back to the geo auto theme
 *
 * A quick pixel "wipe" plays on change (skipped under reduced-motion via the
 * global media query in globals.css).
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  // null = no transition running; boolean = the sweep direction (reverse?).
  const [sweep, setSweep] = useState<boolean | null>(null);

  // Sync the icon from whatever the pre-paint script / server settled on.
  // Deliberately post-mount: SSR and first client render both show the light
  // icon (matching), then this corrects it — reading document during render
  // would cause a hydration mismatch.
  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme) ?? "light";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current);
  }, []);

  // Run a directional pixel sweep while swapping: tiles pop in column-by-column
  // across the page (left→right going dark, right→left going light), the theme
  // flips as the wave crosses, then the columns clear behind it.
  function runWithDissolve(next: Theme) {
    const reverse = next === "light"; // light sweeps the opposite way
    setSweep(reverse);
    window.setTimeout(() => {
      document.documentElement.dataset.theme = next;
      setTheme(next);
    }, 380);
    window.setTimeout(() => setSweep(null), 1150);
  }

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore storage failures */
    }
    runWithDissolve(next);
  }

  function resetToAuto() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    const auto =
      (document.documentElement.dataset.autoTheme as Theme) ?? "light";
    runWithDissolve(auto);
  }

  const isDark = theme === "dark";

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        onDoubleClick={resetToAuto}
        aria-label={isDark ? "Switch to morning (light) mode" : "Switch to night (dark) mode"}
        title="Auto-switches at sunrise/sunset · click to override · double-click for auto"
        className="p-2 rounded hover:bg-white/15 transition-colors text-[color:var(--nav-ink)]"
      >
        {isDark ? <MoonIcon /> : <SunIcon />}
      </button>
      {sweep !== null && <PixelDissolve reverse={sweep} />}
    </>
  );
}

/**
 * Full-screen grid of tiny tiles that pop in column-by-column across the page
 * (a pixel wave), then clear — direction set by `reverse`. A little per-tile
 * jitter keeps it reading as moving pixels rather than a clean solid edge.
 */
function PixelDissolve({ reverse }: { reverse: boolean }) {
  // Computed once (lazy init, off the render path): grid size + per-tile delays.
  const [{ cols, rows, delays }] = useState(() => {
    const c = 18;
    const r =
      typeof window !== "undefined"
        ? Math.max(8, Math.round((c * window.innerHeight) / window.innerWidth))
        : 28;
    const step = 0.03; // per-column stagger → the sweep
    const delays = Array.from({ length: c * r }, (_, i) => {
      const col = i % c;
      const base = (reverse ? c - 1 - col : col) * step;
      return Number((base + Math.random() * 0.045).toFixed(3));
    });
    return { cols: c, rows: r, delays };
  });
  return (
    <div
      className="dissolve-layer"
      style={{ ["--cols" as string]: cols, ["--rows" as string]: rows }}
      aria-hidden
    >
      {delays.map((d, i) => (
        <span key={i} className="dissolve-px" style={{ animationDelay: `${d}s` }} />
      ))}
    </div>
  );
}

/* Blocky pixel-style icons (crisp square rays / stepped crescent). */
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" shapeRendering="crispEdges" aria-hidden>
      <rect x="7" y="7" width="4" height="4" />
      <rect x="8" y="1" width="2" height="2" />
      <rect x="8" y="15" width="2" height="2" />
      <rect x="1" y="8" width="2" height="2" />
      <rect x="15" y="8" width="2" height="2" />
      <rect x="3" y="3" width="2" height="2" />
      <rect x="13" y="3" width="2" height="2" />
      <rect x="3" y="13" width="2" height="2" />
      <rect x="13" y="13" width="2" height="2" />
    </svg>
  );
}

function MoonIcon() {
  // Blocky pixel crescent on an 8×8 grid — matches the sun's pixel style
  // while clearly reading as a moon (fat left edge, open right).
  return (
    <svg width="18" height="18" viewBox="0 0 8 8" fill="currentColor" shapeRendering="crispEdges" aria-hidden>
      <rect x="2" y="0" width="3" height="1" />
      <rect x="1" y="1" width="3" height="1" />
      <rect x="0" y="2" width="3" height="1" />
      <rect x="0" y="3" width="2" height="1" />
      <rect x="0" y="4" width="2" height="1" />
      <rect x="0" y="5" width="3" height="1" />
      <rect x="1" y="6" width="3" height="1" />
      <rect x="2" y="7" width="3" height="1" />
    </svg>
  );
}

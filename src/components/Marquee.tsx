"use client";

import { useState } from "react";

/**
 * Scrolling headline ticker under the nav bar. The item list is duplicated
 * once and the track is animated by -50%, so the loop is seamless. Pauses on
 * hover, plus an explicit pause/play button so keyboard + touch users can
 * stop the motion too (WCAG 2.2.2). The duplicate copy is aria-hidden so
 * screen readers announce each headline only once. Motion is disabled under
 * prefers-reduced-motion (see globals.css), leaving a static, readable strip.
 */
type Item = { title: string; url: string };

function Row({ items, hidden }: { items: Item[]; hidden?: boolean }) {
  return (
    <div
      className="flex items-center shrink-0"
      aria-hidden={hidden}
    >
      {items.map((it, i) => (
        <a
          key={`${it.url}-${i}`}
          href={it.url}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={hidden ? -1 : undefined}
          className="font-pixel inline-flex items-center whitespace-nowrap text-[12px] uppercase tracking-[0.05em] px-4 py-1.5 hover:underline"
          style={{ color: "var(--color-lime)" }}
        >
          <span aria-hidden className="mr-3.5 opacity-60">
            ✦
          </span>
          {it.title}
        </a>
      ))}
    </div>
  );
}

export function Marquee({ items }: { items: Item[] }) {
  const [paused, setPaused] = useState(false);
  if (!items.length) return null;
  return (
    <div
      className="marquee-strip relative overflow-hidden"
      style={{ background: "var(--marquee-bg)" }}
      aria-label="Latest headlines"
    >
      <div
        className="marquee-track flex items-center w-max pr-10"
        style={paused ? { animationPlayState: "paused" } : undefined}
      >
        <Row items={items} />
        <Row items={items} hidden />
      </div>
      {/* Explicit stop control for keyboard/touch users (hover-pause alone
          isn't reachable for them). Sits over the strip's right edge. */}
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? "Resume headline ticker" : "Pause headline ticker"}
        className="absolute right-0 top-0 h-full px-2.5 grid place-items-center"
        style={{ background: "var(--marquee-bg)", color: "var(--color-lime)" }}
      >
        {paused ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" shapeRendering="crispEdges" aria-hidden>
            <path d="M2 1l6 4-6 4z" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" shapeRendering="crispEdges" aria-hidden>
            <rect x="1.5" y="1" width="2.5" height="8" />
            <rect x="6" y="1" width="2.5" height="8" />
          </svg>
        )}
      </button>
    </div>
  );
}

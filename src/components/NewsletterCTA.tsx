"use client";

import { useState } from "react";

/**
 * Homepage email-capture CTA. Posts to /api/subscribe (Buttondown). Peppy
 * pixel aesthetic: a dark→purple gradient band wallpapered with slowly
 * drifting Rorschach pixel patterns (the same symmetric inkblots used for
 * podcast fallbacks), twinkling ✦ sparkles, and corner confetti. States:
 * idle → loading → success / error. The hidden "website" field is a honeypot.
 *
 * Decorative randomness is SEEDED (deterministic) so server and client render
 * identical markup — no hydration mismatch, no Math.random at render time.
 */
type Status = "idle" | "loading" | "success" | "error";

const NAVY = "#1A1340";
const CREAM = "#FBFAF5";
const LIME = "#D4FF3F";

// ── Seeded Rorschach generation (deterministic) ──────────────────────────
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Left half random, mirrored right → a symmetric inkblot grid.
function makeGrid(size: number, seed: number): boolean[][] {
  const rand = mulberry32(seed);
  const half = Math.ceil(size / 2);
  const grid: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < half; x++) grid[y][x] = rand() > 0.45;
    for (let x = half; x < size; x++) grid[y][x] = grid[y][size - 1 - x];
  }
  return grid;
}

type Pattern = {
  grid: boolean[][];
  size: number;
  cell: number;
  color: string;
  top: string;
  left: string;
  rot: number;
  op: number;
  dur: string;
  delay: string;
};

// Hand-placed layout (controlled scatter), seeded pixel grids (organic look).
const PATTERNS: Pattern[] = [
  { size: 8, seed: 11, cell: 9,  color: LIME,      top: "6%",  left: "3%",  rot: 0,  op: 0.18, dur: "22s", delay: "0s" },
  { size: 7, seed: 23, cell: 10, color: "#00E5FF", top: "52%", left: "9%",  rot: 45, op: 0.16, dur: "26s", delay: "-5s" },
  { size: 8, seed: 7,  cell: 9,  color: "#FF4FD8", top: "12%", left: "80%", rot: 0,  op: 0.20, dur: "19s", delay: "-9s" },
  { size: 6, seed: 31, cell: 11, color: LIME,      top: "58%", left: "89%", rot: 90, op: 0.15, dur: "23s", delay: "-13s" },
  { size: 8, seed: 5,  cell: 8,  color: "#00E5FF", top: "76%", left: "42%", rot: 45, op: 0.14, dur: "28s", delay: "-3s" },
  { size: 7, seed: 19, cell: 9,  color: "#FF4FD8", top: "0%",  left: "54%", rot: 0,  op: 0.16, dur: "24s", delay: "-7s" },
].map((p) => ({ ...p, grid: makeGrid(p.size, p.seed) }));

const SPARKLES = [
  { top: "14%", left: "30%", color: LIME,      size: 16, dur: "2.6s", delay: "0s" },
  { top: "68%", left: "22%", color: "#FF4FD8", size: 12, dur: "3.2s", delay: "-1s" },
  { top: "32%", left: "91%", color: "#00E5FF", size: 14, dur: "2.9s", delay: "-1.6s" },
  { top: "84%", left: "62%", color: LIME,      size: 12, dur: "3.5s", delay: "-0.6s" },
  { top: "4%",  left: "68%", color: "#FF4FD8", size: 16, dur: "2.4s", delay: "-2.2s" },
];

type Confetti = {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  color: string;
  size: number;
};
const CONFETTI: Confetti[] = [
  { top: "10px", left: "10px", color: LIME, size: 10 },
  { top: "26px", left: "22px", color: "#FF4FD8", size: 6 },
  { top: "12px", right: "14px", color: "#00E5FF", size: 8 },
  { bottom: "12px", left: "16px", color: "#FF4FD8", size: 8 },
  { bottom: "10px", right: "12px", color: LIME, size: 10 },
  { bottom: "24px", right: "26px", color: "#00E5FF", size: 6 },
];

function RorschachTile({ p }: { p: Pattern }) {
  const px = p.size * p.cell;
  return (
    <div
      className="rorschach-float absolute"
      style={
        {
          top: p.top,
          left: p.left,
          opacity: p.op,
          "--rot": `${p.rot}deg`,
          "--drift-dur": p.dur,
          "--drift-delay": p.delay,
        } as React.CSSProperties
      }
      aria-hidden
    >
      <svg width={px} height={px} viewBox={`0 0 ${p.size} ${p.size}`} shapeRendering="crispEdges">
        {p.grid.flatMap((row, y) =>
          row.map((on, x) =>
            on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={p.color} /> : null
          )
        )}
      </svg>
    </div>
  );
}

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (res.ok && data.message) {
        setMessage(data.message);
        setStatus("success");
      } else {
        setMessage(data.error ?? "Something went wrong. Try again.");
        setStatus("error");
      }
    } catch {
      setMessage("Couldn't subscribe right now. Try again.");
      setStatus("error");
    }
  }

  return (
    <section
      id="subscribe"
      className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 scroll-mt-24"
    >
      {/* Multi-color pixel divider above the band. */}
      <div
        className="h-1.5 mb-8"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--color-lime) 0 12px, var(--color-hot) 12px 24px, var(--color-cyan) 24px 36px, var(--color-amber) 36px 48px)",
        }}
        aria-hidden
      />
      <div
        className="relative overflow-hidden border-[3px] p-7 sm:p-10"
        style={{
          background: "linear-gradient(135deg, #1A1340 0%, #5B3DF5 50%, #3A1FA0 100%)",
          borderColor: NAVY,
          boxShadow: "6px 6px 0 var(--card-shadow)",
        }}
      >
        {/* Drifting Rorschach wallpaper. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {PATTERNS.map((p, i) => (
            <RorschachTile key={i} p={p} />
          ))}
        </div>

        {/* Twinkling ✦ sparkles. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {SPARKLES.map((s, i) => (
            <span
              key={i}
              className="pixel-sparkle absolute leading-none"
              style={
                {
                  top: s.top,
                  left: s.left,
                  color: s.color,
                  fontSize: s.size,
                  "--twk-dur": s.dur,
                  "--twk-delay": s.delay,
                } as React.CSSProperties
              }
            >
              ✦
            </span>
          ))}
        </div>

        {/* Corner confetti squares. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="absolute"
              style={{
                top: c.top,
                left: c.left,
                right: c.right,
                bottom: c.bottom,
                width: c.size,
                height: c.size,
                background: c.color,
              }}
            />
          ))}
        </div>

        {status === "success" ? (
          <p
            className="relative font-heading text-[1.6rem] sm:text-[2rem] leading-tight"
            style={{ color: CREAM }}
          >
            <span style={{ color: LIME }} aria-hidden>
              ✦{" "}
            </span>
            {message}
          </p>
        ) : (
          <div className="relative">
            <p className="font-pixel text-[12px] uppercase tracking-[0.16em]" style={{ color: LIME }}>
              Daily briefing
            </p>
            <h2
              className="font-heading text-[1.8rem] sm:text-[2.4rem] leading-[1.05] mt-2 max-w-[18ch]"
              style={{ color: CREAM }}
            >
              Get the top picks in your inbox each morning.
            </h2>
            <p className="text-[14px] mt-3" style={{ color: "rgba(251,250,245,0.82)" }}>
              7 curated stories. One email. No spam.
            </p>

            <form
              onSubmit={submit}
              className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-stretch max-w-[560px]"
            >
              {/* Honeypot — hidden from humans, untabbable. */}
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] top-0 h-px w-px opacity-0"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                aria-label="Email address"
                className="flex-1 text-[15px] px-4 py-3 border-[3px] outline-none placeholder:text-[#fbfaf580] focus-visible:border-[color:var(--color-cyan)]"
                style={{ background: NAVY, color: CREAM, borderColor: LIME }}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="font-pixel text-[14px] uppercase tracking-[0.06em] px-6 py-3 border-[3px] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                style={{
                  background: LIME,
                  color: NAVY,
                  borderColor: NAVY,
                  boxShadow: "4px 4px 0 #0e0a26",
                }}
              >
                {status === "loading" ? "…" : "Subscribe"}
              </button>
            </form>

            {status === "error" && (
              <p
                className="mt-3 font-pixel text-[12px] uppercase tracking-[0.04em]"
                style={{ color: "#FF8FE0" }}
                role="alert"
              >
                {message}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";

/**
 * Homepage email-capture CTA. Posts to /api/subscribe (Buttondown). Styled as
 * a large article card — flat cream surface, 3px border, hard offset shadow —
 * so it reads as "a card among cards", not a foreign element. Decoration is a
 * scatter of slowly drifting Rorschach pixel inkblots on the RIGHT (left kept
 * clear for text). States: idle → loading → success / error. The hidden
 * "website" field is a honeypot.
 *
 * Decorative grids are SEEDED (deterministic) so SSR == client — no hydration
 * mismatch, no Math.random at render.
 */
type Status = "idle" | "loading" | "success" | "error";

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

// Left half random, mirrored right → a symmetric inkblot (same idea as the
// podcast fallback thumbnails / pull-to-refresh loader).
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
  right: string;
  rot: number;
  op: number;
  dur: string;
  delay: string;
};

// Right-side scatter (left stays clear for the copy). Low opacity → texture.
const PATTERNS: Pattern[] = [
  { size: 8, seed: 11, cell: 9,  color: "#5B3DF5", top: "8%",  right: "5%",  rot: 0,  op: 0.12, dur: "22s", delay: "0s" },
  { size: 7, seed: 23, cell: 10, color: "#D4FF3F", top: "48%", right: "13%", rot: 45, op: 0.14, dur: "26s", delay: "-5s" },
  { size: 8, seed: 7,  cell: 9,  color: "#FF4FD8", top: "18%", right: "24%", rot: 0,  op: 0.12, dur: "19s", delay: "-9s" },
  { size: 6, seed: 31, cell: 11, color: "#00E5FF", top: "60%", right: "3%",  rot: 90, op: 0.13, dur: "23s", delay: "-13s" },
  { size: 7, seed: 19, cell: 9,  color: "#5B3DF5", top: "74%", right: "20%", rot: 45, op: 0.11, dur: "27s", delay: "-3s" },
].map((p) => ({ ...p, grid: makeGrid(p.size, p.seed) }));

function RorschachTile({ p }: { p: Pattern }) {
  const px = p.size * p.cell;
  return (
    <div
      className="rorschach-float absolute"
      style={
        {
          top: p.top,
          right: p.right,
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

      {/* Flat card — same treatment as every article card, just wider. */}
      <div className="surface-card relative overflow-hidden p-7 sm:p-10">
        {/* Drifting Rorschach texture on the right; hidden on mobile so the
            copy column stays clean. */}
        <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
          {PATTERNS.map((p, i) => (
            <RorschachTile key={i} p={p} />
          ))}
        </div>

        {status === "success" ? (
          <p className="relative font-heading text-[1.6rem] sm:text-[2rem] leading-tight text-ink">
            <span className="text-accent" aria-hidden>
              ✦{" "}
            </span>
            {message}
          </p>
        ) : (
          <div className="relative">
            <p className="font-pixel text-[12px] uppercase tracking-[0.16em] text-accent">
              Daily briefing
            </p>
            <h2 className="font-heading text-[2rem] sm:text-[2.3rem] leading-[1.05] text-ink mt-2 max-w-[19ch]">
              Get the top picks in your inbox each morning.
            </h2>
            <p className="text-[14px] text-ink-muted mt-3">
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
              {/* Cream input — a card inside the card; the dark re-scoped ink
                  reads on it in both site themes. */}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                aria-label="Email address"
                className="flex-1 bg-[color:var(--color-card)] text-ink text-[15px] px-4 py-3 border-[3px] border-[color:var(--card-border)] outline-none placeholder:text-ink-subtle focus-visible:border-accent shadow-[3px_3px_0_var(--card-shadow)]"
              />
              {/* Lime button — pixel font, hard shadow, card-style hover lift. */}
              <button
                type="submit"
                disabled={status === "loading"}
                className="font-pixel text-[14px] uppercase tracking-[0.06em] px-6 py-3 border-[3px] border-[color:var(--card-border)] text-[#1a1340] bg-[color:var(--color-lime)] shadow-[3px_3px_0_var(--card-shadow)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--card-shadow)] active:translate-x-0 active:translate-y-0 disabled:opacity-60"
              >
                {status === "loading" ? "…" : "Subscribe"}
              </button>
            </form>

            {status === "error" && (
              <p
                className="mt-3 font-pixel text-[12px] uppercase tracking-[0.04em] text-accent"
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

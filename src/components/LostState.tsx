import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Human error states. Readers never see a status code: each state says what
 * happened in plain words, makes clear it isn't their fault, and offers the
 * best next step. Search engines still get the right HTTP status from the
 * route; this is only what people see.
 *
 * Layout (from design review, 2026-11-20): copy left-aligned in a wide column
 * with the animated paper beside it, not a narrow centred stack; at most two
 * actions, as a matched primary + secondary pair; related things (edition
 * cards, section list) sit full width below. Client-safe (no server imports)
 * so the client-side not-found page can use it too.
 */

export type PaperMood = "printing" | "blank" | "end" | "jam";

type Action = { href?: string; onClick?: () => void; label: string };

export function LostState({
  mood,
  kicker,
  title,
  body,
  primary,
  secondary,
  noindex = false,
  children,
}: {
  mood: PaperMood;
  kicker: string;
  title: string;
  body: ReactNode;
  primary?: Action;
  secondary?: Action;
  /** For states rendered inside a 200 page (data-dependent misses). */
  noindex?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="site-container py-12 sm:py-20">
      {/* React hoists this into <head>. */}
      {noindex && <meta name="robots" content="noindex" />}
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="order-2 md:order-1">
          <p className="font-pixel text-[12px] uppercase tracking-[0.16em] text-accent">{kicker}</p>
          <h1
            className="mt-3 font-heading text-[2.1rem] sm:text-[2.8rem] leading-[1.05] text-ink"
            style={{ textWrap: "balance" }}
          >
            {title}
          </h1>
          <div
            className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-muted"
            style={{ textWrap: "pretty" }}
          >
            {body}
          </div>
          {(primary || secondary) && (
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {primary && <LostButton action={primary} variant="primary" />}
              {secondary && <LostButton action={secondary} variant="secondary" />}
            </div>
          )}
        </div>
        <div className="order-1 md:order-2 flex justify-center md:justify-end">
          <PrintingPaper mood={mood} />
        </div>
      </div>
      {children && <div className="mt-12">{children}</div>}
    </section>
  );
}

/** Matched pair: same size and type; primary filled, secondary outlined. */
function LostButton({ action, variant }: { action: Action; variant: "primary" | "secondary" }) {
  const base =
    "inline-flex items-center justify-center h-11 px-5 font-pixel text-[13px] uppercase tracking-[0.08em] border-[3px] border-ink transition-transform hover:-translate-y-0.5";
  const look =
    variant === "primary"
      ? "bg-ink text-paper shadow-[4px_4px_0_0_var(--color-accent)]"
      : "bg-transparent text-ink";
  const cls = `${base} ${look}`;
  if (action.onClick) {
    return (
      <button type="button" onClick={action.onClick} className={cls}>
        {action.label}
      </button>
    );
  }
  return (
    <Link href={action.href ?? "/"} className={cls}>
      {action.label}
    </Link>
  );
}

/*
 * Animated pixel newspaper: text lines "print" onto the sheet one by one in
 * stepped pixel motion, then clear and print again.
 *   printing — loops, with a story printing in the slot (still being made)
 *   blank    — loops, with a blinking cursor where the story should be
 *   end      — prints once and stops with an end mark
 *   jam      — the sheet judders and lines stutter
 * Static under prefers-reduced-motion.
 */
const LINES: { x: number; y: number; w: number }[] = [
  { x: 3, y: 7, w: 11 }, { x: 3, y: 9, w: 12 }, { x: 3, y: 11, w: 9 },
  { x: 3, y: 14, w: 12 }, { x: 3, y: 16, w: 10 }, { x: 3, y: 18, w: 7 },
  { x: 18, y: 7, w: 11 }, { x: 18, y: 9, w: 12 }, { x: 18, y: 11, w: 8 },
];

export function PrintingPaper({ mood }: { mood: PaperMood }) {
  const c = 8; // one pixel cell
  const W = 34;
  const H = 24;
  return (
    <svg
      viewBox={`0 0 ${W * c} ${H * c}`}
      className={`lost-paper lost-${mood} w-[220px] sm:w-[272px] h-auto`}
      style={{ imageRendering: "pixelated" }}
      aria-hidden
    >
      <style>{`
        .lost-paper .sheet { transform-box: fill-box; transform-origin: center; }
        .lost-paper .ln, .lost-paper .mark { transform-box: fill-box; transform-origin: left center; }
        @keyframes lost-print { 0%,8% { transform: scaleX(0) } 30%,82% { transform: scaleX(1) } 100% { transform: scaleX(0) } }
        @keyframes lost-once { 0% { transform: scaleX(0) } 100% { transform: scaleX(1) } }
        @keyframes lost-blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
        @keyframes lost-judder { 0%,70%,100% { transform: translate(0,0) rotate(0) } 74% { transform: translate(-3px,1px) rotate(-1.5deg) } 78% { transform: translate(3px,-1px) rotate(1.5deg) } 82% { transform: translate(-2px,0) rotate(-1deg) } 86% { transform: translate(0,0) rotate(0) } }
        .lost-printing .ln, .lost-blank .ln { animation: lost-print 4.2s steps(6) infinite; }
        .lost-end .ln { animation: lost-once 0.5s steps(6) both; }
        .lost-jam .ln { animation: lost-print 2.6s steps(3) infinite; }
        .lost-jam .sheet { animation: lost-judder 2.6s steps(12) infinite; }
        .lost-paper .cursor { animation: lost-blink 1s steps(1) infinite; }
        .lost-end .mark { animation: lost-once 0.2s steps(1) both; animation-delay: 2.2s; }
        @media (prefers-reduced-motion: reduce) {
          .lost-paper .ln, .lost-paper .sheet, .lost-paper .cursor, .lost-paper .mark { animation: none !important; transform: none !important; opacity: 1 !important; }
        }
      `}</style>
      <g className="sheet">
        {/* hard pixel shadow, sheet + border */}
        <rect x={2 * c} y={2 * c} width={(W - 2) * c} height={(H - 2) * c} fill="var(--color-accent)" />
        <rect
          x={c / 2}
          y={c / 2}
          width={(W - 2) * c - c}
          height={(H - 2) * c - c}
          // The sheet stays paper-white in both themes (like the site's cards
          // in the morning theme), so the ink colours below are fixed.
          fill="#fffdf7"
          stroke="#1a1340"
          strokeWidth={c}
        />
        {/* masthead */}
        <rect x={3 * c} y={3 * c} width={(W - 8) * c} height={2 * c} fill="#1a1340" />
        {/* column rule */}
        <rect x={16 * c} y={7 * c} width={c / 2} height={12 * c} fill="#1a1340" opacity={0.3} />
        {LINES.map((l, i) => (
          <rect
            key={i}
            className="ln"
            x={l.x * c}
            y={l.y * c}
            width={l.w * c}
            height={c}
            fill={i === 0 || i === 6 ? "#1a1340" : "#5c5470"}
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
        {mood === "blank" && (
          <rect className="cursor" x={18 * c} y={14 * c} width={c} height={3 * c} fill="#5b3df5" />
        )}
        {mood === "printing" && (
          <>
            <rect className="ln" x={18 * c} y={14 * c} width={9 * c} height={c} fill="#5b3df5" style={{ animationDelay: "1.7s" }} />
            <rect className="cursor" x={28 * c} y={14 * c} width={c} height={c} fill="#5b3df5" />
          </>
        )}
        {mood === "end" && <rect className="mark" x={18 * c} y={14 * c} width={3 * c} height={3 * c} fill="#5b3df5" />}
        {mood === "jam" && (
          <polyline
            points={`${18 * c},${14 * c} ${20 * c},${17 * c} ${22 * c},${14 * c} ${24 * c},${17 * c} ${26 * c},${14 * c} ${28 * c},${17 * c}`}
            fill="none"
            stroke="#5b3df5"
            strokeWidth={c}
          />
        )}
      </g>
    </svg>
  );
}

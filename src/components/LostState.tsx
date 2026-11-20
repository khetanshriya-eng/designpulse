import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Human error states. Readers never see a status code: each state says what
 * happened in plain words, makes clear it isn't their fault, and leads with
 * the most likely next step. The art comes from Designator's own world (a
 * daily paper), drawn in the site's pixel language. Search engines still get
 * the right HTTP status from the route; this is only what people see.
 */

export type LostArt = "blank" | "press" | "end" | "jam";

type Action = { href: string; label: string; primary?: boolean };

export function LostState({
  art,
  kicker,
  title,
  body,
  actions = [],
  noindex = false,
  children,
}: {
  art: LostArt;
  kicker: string;
  title: string;
  body: ReactNode;
  actions?: Action[];
  /** For states rendered inside a 200 page (data-dependent misses). */
  noindex?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-[600px] mx-auto px-4 py-16 sm:py-24 text-center">
      {/* React hoists this into <head>. */}
      {noindex && <meta name="robots" content="noindex" />}
      <PixelPaper art={art} />
      <p className="mt-8 font-pixel text-[12px] uppercase tracking-[0.16em] text-accent">
        {kicker}
      </p>
      <h1 className="mt-2 font-heading text-[2rem] sm:text-[2.4rem] leading-tight text-ink">
        {title}
      </h1>
      <div className="mt-3 text-[15px] leading-relaxed text-ink-muted">{body}</div>
      {actions.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          {actions.map((a) =>
            a.primary ? (
              <Link
                key={a.href + a.label}
                href={a.href}
                className="surface-card inline-block font-pixel text-[13px] uppercase tracking-[0.08em] px-4 py-2 text-ink"
              >
                {a.label}
              </Link>
            ) : (
              <Link
                key={a.href + a.label}
                href={a.href}
                className="font-pixel text-[13px] uppercase tracking-[0.08em] text-accent hover:underline"
              >
                {a.label}
              </Link>
            )
          )}
        </div>
      )}
      {children && <div className="mt-10">{children}</div>}
    </div>
  );
}

/*
 * A folded newspaper, 24×18 cells. "#" = ink, "-" = headline/text rule,
 * "." = paper. The glyph in the lower-right panel changes per state.
 */
const PAPER = [
  "########################",
  "#......................#",
  "#.####################.#",
  "#......................#",
  "#.--------.#..........##",
  "#.--------.#..........##",
  "#..........#..........##",
  "#.--------.#..........##",
  "#.------...#..........##",
  "#..........#..........##",
  "#.--------.#..........##",
  "#.--------.#..........##",
  "#.-----....#..........##",
  "#..........#..........##",
  "#.--------.#..........##",
  "#.------...#..........##",
  "#......................#",
  "########################",
];

// 8×8 glyphs placed in the right-hand panel (columns 13–20, rows 6–13).
const GLYPHS: Record<LostArt, string[]> = {
  // "?" — the page you wanted isn't printed
  blank: ["..####..", ".##..##.", "......##", ".....##.", "....##..", "........", "....##..", "....##.."],
  // clock — still on the press
  press: ["..####..", ".#....#.", "#...#..#", "#...#..#", "#...###.", "#......#", ".#....#.", "..####.."],
  // end mark ■ — end of the section
  end: ["........", "........", "..####..", "..####..", "..####..", "..####..", "........", "........"],
  // zigzag tear — the press jammed
  jam: ["#.......", ".#.....#", "..#...#.", "...#.#..", "....#...", "...#.#..", "..#...#.", ".#.....#"],
};

export function PixelPaper({ art }: { art: LostArt }) {
  const cell = 6;
  const rects: ReactNode[] = [];
  PAPER.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === "#") rects.push(<rect key={`p${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="var(--color-ink)" />);
      if (ch === "-") rects.push(<rect key={`p${x}-${y}`} x={x * cell} y={y * cell + 2} width={cell} height={2} fill="var(--color-ink-muted)" />);
    })
  );
  GLYPHS[art].forEach((row, gy) =>
    [...row].forEach((ch, gx) => {
      if (ch === "#") rects.push(<rect key={`g${gx}-${gy}`} x={(13 + gx) * cell} y={(6 + gy) * cell} width={cell} height={cell} fill="var(--color-accent)" />);
    })
  );
  return (
    <svg
      viewBox={`0 0 ${24 * cell} ${18 * cell}`}
      width={24 * cell}
      height={18 * cell}
      className="mx-auto block"
      style={{ imageRendering: "pixelated" }}
      role="img"
      aria-hidden
    >
      <rect x={cell} y={cell} width={22 * cell} height={16 * cell} fill="var(--color-paper)" />
      {rects}
    </svg>
  );
}

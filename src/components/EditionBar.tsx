"use client";

import { useEffect, useState } from "react";
import { getEditionName } from "@/lib/editionName";
import { formatEditionDate } from "@/lib/format";
import { EditionPicker } from "./EditionPicker";
import { ShareEditionButton } from "./ShareEditionButton";

/**
 * Identity bar for an edition, below the category tabs: the quirky edition
 * name over its date (tap to open the date picker) on the left, share on the
 * right.
 *
 * `live` (homepage only): the day's edition is produced by the morning
 * pipeline (~08:00 IST), so between IST midnight and the drop the newest
 * edition in the DB is still yesterday's. Rather than sit on a stale date all
 * morning, the bar rolls the header to *today* at midnight and shows a
 * countdown to the drop — the existing content stays visible underneath until
 * the pipeline refreshes it (and busts the cache). Per-date edition pages are
 * never `live` — they're fixed snapshots.
 */
const IST_OFFSET_MS = 5.5 * 3_600_000;
const MORNING_DROP_HOUR = 8; // 02:30 UTC pipeline ≈ 08:00 IST
const GRACE_HOUR = 10; // past this (IST) with no drop, stop the optimistic roll

type Live = { rolledDate: string; countdownMs: number | null } | null;

/**
 * Decide the live state from the viewer's clock, entirely in IST (the
 * editorial timezone) so it's identical for every visitor regardless of where
 * they are. Returns null = show the real edition + share (normal bar).
 */
function computeLive(editionDate: string): Live {
  const istMs = Date.now() + IST_OFFSET_MS;
  const d = new Date(istMs); // read its UTC fields as IST wall-clock
  const istDate = d.toISOString().slice(0, 10);
  // Today's edition is already here (or this is a future/edge case) → normal.
  if (editionDate >= istDate) return null;
  // The morning drop should have landed by GRACE_HOUR; if it hasn't, stop
  // pretending and just show the real (previous) edition honestly.
  if (d.getUTCHours() >= GRACE_HOUR) return null;

  const sinceMidnightMs =
    (d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds()) *
      1000 +
    d.getUTCMilliseconds();
  const dropMs = istMs - sinceMidnightMs + MORNING_DROP_HOUR * 3_600_000;
  const remaining = dropMs - istMs;
  // remaining <= 0 → we're in the brief 08:00-10:00 window where the pipeline
  // is running but content hasn't flipped yet: "cooking, any minute".
  return { rolledDate: istDate, countdownMs: remaining > 0 ? remaining : null };
}

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${hh}:${p(mm)}:${p(ss)}`;
}

export function EditionBar({
  date,
  live = false,
}: {
  date: string;
  live?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // null until mounted — the awaiting state depends on the viewer's clock,
  // which the static/ISR server can't know, so we compute it post-mount to
  // avoid a hydration mismatch (SSR + first paint = the plain, real edition).
  const [liveState, setLiveState] = useState<Live>(null);

  useEffect(() => {
    if (!live) return;
    const tick = () => setLiveState(computeLive(date));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [live, date]);

  const awaiting = liveState !== null;
  const shownDate = awaiting ? liveState.rolledDate : date;
  const name = getEditionName(shownDate);

  return (
    <div className="site-container">
      <div className="relative flex items-center justify-between gap-3 pt-4 pb-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="Browse past editions"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="group flex flex-col items-start gap-0.5 min-w-0 text-left"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-heading text-[1.3rem] sm:text-[1.6rem] leading-none text-ink truncate">
              {name}
            </span>
            <span
              aria-hidden
              className={`shrink-0 inline-flex items-center justify-center w-5 h-5 bg-lime border-2 border-[#1a1340] transition-transform group-hover:translate-y-0.5 ${
                open ? "rotate-180" : ""
              }`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" shapeRendering="crispEdges">
                <path d="M1 3l4 4 4-4" stroke="#1a1340" strokeWidth="2" />
              </svg>
            </span>
          </span>
          <span className="font-mono text-[12px] text-ink-subtle whitespace-nowrap">
            {formatEditionDate(shownDate)}
          </span>
        </button>

        {awaiting ? (
          <NextDropChip ms={liveState.countdownMs} />
        ) : (
          <ShareEditionButton editionUrl={`https://designatorapp.com/edition/${date}`} />
        )}

        <EditionPicker open={open} onClose={() => setOpen(false)} currentDate={date} />
      </div>
    </div>
  );
}

/**
 * Countdown to the morning drop. Pixel chip on the card surface (so it reads
 * in both themes), a pulsing lime dot, and a monospace tabular timer.
 */
function NextDropChip({ ms }: { ms: number | null }) {
  return (
    <div
      className="shrink-0 self-start inline-flex items-center gap-2.5 p-2 sm:px-3 sm:py-2 border-[3px] border-[color:var(--card-border)] bg-[color:var(--color-card)] shadow-[3px_3px_0_var(--card-shadow)]"
      title="When today's fresh edition is expected"
      aria-live="polite"
    >
      <span
        className="edition-pulse w-2 h-2 shrink-0"
        style={{ background: "var(--color-lime)" }}
        aria-hidden
      />
      <span className="flex flex-col leading-none gap-0.5">
        <span className="font-pixel text-[8px] sm:text-[9px] uppercase tracking-[0.14em] text-ink-subtle">
          {ms === null ? "Fresh pixels cooking" : "Next drop in"}
        </span>
        <span className="font-mono text-[13px] sm:text-[15px] font-bold text-ink tabular-nums">
          {ms === null ? "any minute…" : fmtCountdown(ms)}
        </span>
      </span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getEditionName } from "@/lib/editionName";
import { formatEditionDate } from "@/lib/format";
import { BottomSheet } from "./BottomSheet";
import { PixelLoader } from "./PixelLoader";

type Edition = { date: string; count: number };

/**
 * Browse/jump to any edition. Desktop: a dropdown anchored under the edition
 * name. Mobile: a bottom sheet (slide-up, drag-to-dismiss, scroll lock — all
 * from the shared BottomSheet). Cream panel with fixed navy text (lives
 * outside the card ink re-scope).
 *
 * The filter input is NOT autofocused: on mobile that would summon the iOS
 * keyboard the moment the sheet opens and shift the whole layout. The list is
 * immediately visible; the keyboard appears only when the input is tapped.
 * (On desktop the BottomSheet's focus handling puts the caret in the input.)
 */
export function EditionPicker({
  open,
  onClose,
  currentDate,
}: {
  open: boolean;
  onClose: () => void;
  currentDate: string;
}) {
  const [search, setSearch] = useState("");
  // null = not yet loaded (drives the loading state without a synchronous
  // setState in the effect). Fetched once on first open and cached.
  const [editions, setEditions] = useState<Edition[] | null>(null);

  useEffect(() => {
    if (!open || editions !== null) return;
    let cancelled = false;
    fetch("/api/archive?all=true")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setEditions(d.editions ?? []);
      })
      .catch(() => {
        if (!cancelled) setEditions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, editions]);

  const loading = editions === null;

  const q = search.trim().toLowerCase();
  const rows = (editions ?? []).map((e) => ({
    ...e,
    name: getEditionName(e.date),
    label: formatEditionDate(e.date),
  }));
  const filtered = q
    ? rows.filter(
        (r) =>
          r.date.includes(q) ||
          r.label.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q)
      )
    : rows;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      ariaLabel="Browse editions"
      closeOnDesktopScroll
      desktopClassName="md:absolute md:inset-x-auto md:bottom-auto md:top-full md:left-0 md:mt-2 md:h-auto md:w-[380px] md:max-h-[440px] md:border-[3px] md:shadow-[5px_5px_0_var(--card-shadow)]"
    >
      {/* Search — pinned just under the handle; never scrolls away. The 16px
          mobile rule in globals.css keeps iOS from auto-zooming on focus. */}
      <div className="flex-shrink-0 p-3 border-b-[3px] border-[color:var(--card-border)]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Jump to a date or edition…"
          aria-label="Filter editions"
          className="w-full bg-transparent font-mono text-[14px] text-[#1a1340] placeholder:text-[#1a1340]/45 outline-none"
        />
      </div>

      {/* List — the only scroll area, so the input stays put. min-h keeps a
          single result from collapsing; safe-area padding clears the home bar. */}
      <div
        className="flex-1 min-h-[120px] overflow-y-auto overscroll-contain"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <PixelLoader loading opacity={1} />
            <span className="font-mono text-[11px] text-[#1a1340]/55">
              Loading editions…
            </span>
          </div>
        )}
        {!loading &&
          filtered.map((r) => (
            <Link
              key={r.date}
              href={`/edition/${r.date}`}
              onClick={onClose}
              className={`flex items-center justify-between gap-3 px-4 py-3 border-b border-[color:var(--card-border)]/20 transition-colors hover:bg-[#1a1340]/[0.06] ${
                r.date === currentDate ? "bg-[#1a1340]/[0.06]" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="font-pixel text-[13px] text-[#1a1340] truncate">
                  {r.name}
                </div>
                <div className="font-mono text-[11px] text-[#1a1340]/55">
                  {r.label}
                </div>
              </div>
              <span className="font-mono text-[11px] text-[#1a1340]/55 shrink-0">
                {r.count}
              </span>
            </Link>
          ))}
        {!loading && filtered.length === 0 && (
          <p className="p-4 text-center font-mono text-[12px] text-[#1a1340]/60">
            No editions match &ldquo;{search}&rdquo;.
          </p>
        )}
      </div>
    </BottomSheet>
  );
}

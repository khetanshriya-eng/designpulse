"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getEditionName } from "@/lib/editionName";
import { formatEditionDate } from "@/lib/format";
import { PixelLoader } from "./PixelLoader";

type Edition = { date: string; count: number };

/**
 * Browse/jump to any edition. Desktop: a dropdown anchored under the edition
 * name. Mobile: a bottom sheet that slides up (drag handle, swipe-down or
 * backdrop-tap to dismiss). Same content either way — the only difference is
 * positioning. Cream panel with fixed navy text (lives outside the card ink
 * re-scope).
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
  // Live drag-to-dismiss (mobile): dragY = px pulled down from rest; dragging
  // disables the snap-back transition so the sheet tracks the finger 1:1.
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartY = useRef<number | null>(null);

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

  // While open, flag the document so PullToRefresh stands down — otherwise a
  // downward drag on the sheet bubbles to #app-scroll and fires the refresh
  // loader instead of dismissing the sheet. (dragY/dragging always settle back
  // to rest on touchend, so there's no leftover offset to reset here.)
  useEffect(() => {
    if (!open) return;
    document.documentElement.dataset.modalOpen = "true";
    return () => {
      delete document.documentElement.dataset.modalOpen;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Desktop only: the dropdown is anchored to the (scrolling) edition bar, so
  // close it on page scroll instead of letting it drift over the sticky header.
  // The mobile bottom sheet is fixed, so we leave it be.
  useEffect(() => {
    if (!open) return;
    function onScroll() {
      if (window.matchMedia("(min-width: 768px)").matches) onClose();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open, onClose]);

  if (!open) return null;

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
    <>
      {/* Backdrop — dims the page on mobile (bottom sheet), transparent
          click-catcher on desktop (dropdown). */}
      <button
        aria-label="Close edition picker"
        onClick={onClose}
        tabIndex={-1}
        className="fixed inset-0 z-40 max-md:bg-[color:var(--color-scrim)]"
      />

      <div
        role="dialog"
        aria-label="Browse editions"
        className="sheet-up fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col bg-[color:var(--color-card)] border-t-[3px] border-[color:var(--card-border)] md:absolute md:inset-x-auto md:bottom-auto md:top-full md:left-0 md:mt-2 md:h-auto md:w-[380px] md:max-h-[440px] md:border-[3px] md:shadow-[5px_5px_0_var(--card-shadow)]"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 0.24s ease-out",
        }}
      >
        {/* Drag handle (mobile) — grab + pull down to dismiss. The sheet tracks
            the finger (dragY); past ~110px it slides the rest of the way out and
            closes, otherwise it springs back. touch-none keeps the browser from
            scrolling/refreshing under the drag. */}
        <div
          className="md:hidden flex flex-shrink-0 justify-center pt-3 pb-2 cursor-grab touch-none"
          onTouchStart={(e) => {
            touchStartY.current = e.touches[0].clientY;
            setDragging(true);
          }}
          onTouchMove={(e) => {
            if (touchStartY.current == null) return;
            const dy = e.touches[0].clientY - touchStartY.current;
            setDragY(dy > 0 ? dy : 0);
          }}
          onTouchEnd={() => {
            setDragging(false);
            touchStartY.current = null;
            if (dragY > 110) {
              // Finish the slide-out, then unmount.
              setDragY(window.innerHeight);
              window.setTimeout(() => {
                onClose();
                setDragY(0);
              }, 200);
            } else {
              setDragY(0);
            }
          }}
        >
          <span className="h-1.5 w-10 rounded-full" style={{ background: "rgba(26,19,64,0.3)" }} />
        </div>

        {/* Search — pinned just under the handle; never scrolls away. The 16px
            mobile rule in globals.css keeps iOS from auto-zooming on focus. */}
        <div className="flex-shrink-0 p-3 border-b-[3px] border-[color:var(--card-border)]">
          <input
            autoFocus
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
      </div>
    </>
  );
}

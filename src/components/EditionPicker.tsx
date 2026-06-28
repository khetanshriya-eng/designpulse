"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getEditionName } from "@/lib/editionName";
import { formatEditionDate } from "@/lib/format";

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

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      {/* Backdrop — dims on mobile, transparent click-catcher on desktop. */}
      <button
        aria-label="Close edition picker"
        onClick={onClose}
        tabIndex={-1}
        className="fixed inset-0 z-40 md:bg-transparent"
        style={{ background: "var(--color-scrim)" }}
      />

      <div
        role="dialog"
        aria-label="Browse editions"
        className="sheet-up md:[animation:none] fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col bg-[color:var(--color-card)] border-t-[3px] border-[color:var(--card-border)] md:absolute md:inset-x-auto md:bottom-auto md:top-full md:left-0 md:mt-2 md:w-[380px] md:max-h-[440px] md:border-[3px] md:shadow-[5px_5px_0_var(--card-shadow)]"
      >
        {/* Drag handle (mobile) — also the swipe-to-dismiss target. */}
        <div
          className="md:hidden flex justify-center pt-2 pb-1 cursor-grab"
          onTouchStart={(e) => {
            touchStartY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (
              touchStartY.current != null &&
              e.changedTouches[0].clientY - touchStartY.current > 60
            ) {
              onClose();
            }
            touchStartY.current = null;
          }}
        >
          <span className="h-1.5 w-10 rounded-full" style={{ background: "rgba(26,19,64,0.3)" }} />
        </div>

        {/* Search */}
        <div className="p-3 border-b-[3px] border-[color:var(--card-border)]">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Jump to a date or edition…"
            aria-label="Filter editions"
            className="w-full bg-transparent font-mono text-[14px] text-[#1a1340] placeholder:text-[#1a1340]/45 outline-none"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto">
          {loading && (
            <p className="p-4 text-center font-mono text-[12px] text-[#1a1340]/60">
              Loading…
            </p>
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

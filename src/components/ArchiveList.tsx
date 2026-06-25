"use client";

import { useState } from "react";
import Link from "next/link";
import { CopyLink } from "./CopyLink";
import type { ArchiveEdition } from "@/lib/data/queries";

const SITE = "https://designatorapp.com";

function dateLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Reverse-chronological list of past editions. Each row is a stacked pixel
 * card (borders merged via -mb, lifts on hover) linking to /edition/<date>,
 * with a copy-link cell for sharing that specific edition. "Load more" appends
 * the next page from /api/archive.
 */
export function ArchiveList({
  initial,
  hasMore: initialHasMore,
  today,
}: {
  initial: ArchiveEdition[];
  hasMore: boolean;
  today: string;
}) {
  const [editions, setEditions] = useState(initial);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (loading) return;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await fetch(`/api/archive?page=${next}`);
      const data = (await res.json()) as {
        editions: ArchiveEdition[];
        hasMore: boolean;
      };
      setEditions((prev) => [...prev, ...(data.editions ?? [])]);
      setPage(next);
      setHasMore(!!data.hasMore);
    } catch {
      /* leave the button in place to retry */
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col">
        {editions.map((ed) => {
          const isToday = ed.date === today;
          return (
            <div
              key={ed.date}
              className="relative surface-card flex items-stretch -mb-[3px] hover:z-10"
            >
              <Link
                href={`/edition/${ed.date}`}
                className="flex-1 flex items-center justify-between gap-4 p-5 min-w-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    {isToday && (
                      <span
                        className="font-pixel text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 text-[#1a1340]"
                        style={{ background: "var(--color-lime)" }}
                      >
                        Today
                      </span>
                    )}
                    <span className="font-pixel text-[13px] text-ink">
                      {dateLabel(ed.date)}
                    </span>
                  </div>
                  {ed.heroTitle && (
                    <p className="text-[12px] text-ink-subtle truncate mt-1">
                      Top story: {ed.heroTitle}
                      {ed.heroSource ? ` · ${ed.heroSource}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[12px] text-ink-subtle whitespace-nowrap">
                    {ed.count} {ed.count === 1 ? "story" : "stories"}
                  </span>
                  <span aria-hidden className="font-pixel text-[14px] text-accent">
                    →
                  </span>
                </div>
              </Link>
              <div className="shrink-0 flex items-center px-4 border-l-[3px] border-[color:var(--card-border)]">
                <CopyLink
                  url={`${SITE}/edition/${ed.date}`}
                  compact
                  label="Copy edition link"
                />
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-8 surface-card font-pixel text-[13px] uppercase tracking-[0.06em] px-5 py-3 text-ink disabled:opacity-60"
        >
          {loading ? "Loading…" : "← Load more editions"}
        </button>
      )}
    </>
  );
}

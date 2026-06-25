import type { Metadata } from "next";
import Link from "next/link";
import { getArchiveEditions } from "@/lib/data/queries";
import { ArchiveList } from "@/components/ArchiveList";

export const metadata: Metadata = {
  title: "Archive · Designator",
  description: "Browse every past daily edition of Designator, newest first.",
};

// ISR — the archive only changes when a new edition is curated.
export const revalidate = 600;

export default async function ArchivePage() {
  const { editions, total } = await getArchiveEditions(20, 0);
  const hasMore = editions.length < total;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <article className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-24">
      <p className="font-pixel text-[12px] uppercase tracking-[0.16em] text-accent mb-3">
        Past editions
      </p>
      <h1 className="font-heading text-[2.4rem] sm:text-[3rem] leading-[1.02] text-ink">
        Archive
      </h1>
      <p className="mt-3 text-[15px] text-ink-muted">
        Every daily edition, newest first.
      </p>

      <div className="mt-10">
        {editions.length === 0 ? (
          <p className="text-[14px] text-ink-subtle">
            No editions yet — check back after the next briefing.
          </p>
        ) : (
          <ArchiveList initial={editions} hasMore={hasMore} today={today} />
        )}
      </div>

      <Link
        href="/"
        className="inline-block mt-12 text-[13px] font-medium text-accent hover:underline"
      >
        ← Back to today&apos;s edition
      </Link>
    </article>
  );
}

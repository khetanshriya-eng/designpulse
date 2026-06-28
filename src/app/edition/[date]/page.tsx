/**
 * Per-date edition page. Mirrors the homepage but pinned to one edition_date,
 * with prev/next navigation that walks the actual list of curated editions in
 * the DB (rather than naive ±1 day arithmetic — there may be gaps).
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { HeroCard } from "@/components/HeroCard";
import { MustReadSection } from "@/components/MustReadSection";
import { EditorsPick } from "@/components/EditorsPick";
import { SectionHeader } from "@/components/SectionHeader";
import { EditionBar } from "@/components/EditionBar";
import { formatEditionDate } from "@/lib/format";
import {
  getEdition,
  getLatest,
  listEditionDates,
} from "@/lib/data/queries";

// Real month/day ranges — 2026-99-99 should 404 at the regex, not hit the DB.
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
type Params = { date: string };

// ISR so the CDN can cache edition pages (theme is client-resolved).
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { date } = await params;
  if (!DATE_RE.test(date)) return { title: "Not found" };
  return {
    title: `Edition · ${formatEditionDate(date)} · Designator`,
    description: `Designator daily edition for ${formatEditionDate(date)}.`,
  };
}

export default async function EditionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();

  const [edition, allDates] = await Promise.all([
    getEdition(date),
    listEditionDates(60),
  ]);

  if (!edition) notFound();

  // Latest grid restricted to the same day's window — approximate by pulling
  // 8 most recent across the system. (We don't pin "latest" to a date because
  // articles don't carry an edition_date.)
  const excludeIds = [
    edition.hero?.id,
    edition.editorsPick?.id,
    ...edition.mustReads.map((m) => m.id),
  ].filter((x): x is string => !!x);
  const latest = await getLatest(6, excludeIds);

  return (
    <>
      {/* Named edition + date picker + share (replaces the old prev/next nav). */}
      <EditionBar date={edition.date} />

      {edition.hero && (
        <section className="site-container pt-4 pb-16">
          <HeroCard article={edition.hero} />
        </section>
      )}

      {latest.length > 0 && (
        <section className="site-container pb-16">
          <SectionHeader
            kicker="In this edition"
            title="Latest stories"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-10">
            {latest.map((a) => (
              <ArticleCard key={a.id} article={a} variant="default" />
            ))}
          </div>
        </section>
      )}

      {edition.mustReads.length > 0 && (
        <section className="site-container pb-16">
          <MustReadSection articles={edition.mustReads} />
        </section>
      )}

      {edition.editorsPick && (
        <section className="site-container pb-16">
          <EditorsPick article={edition.editorsPick} />
        </section>
      )}

      {/* All-editions list */}
      <section className="site-container pb-16">
        <SectionHeader kicker="Archive" title="All editions" />
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-[13.5px]">
          {allDates.map((d) => (
            <li key={d}>
              <Link
                href={`/edition/${d}`}
                className={
                  d === edition.date
                    ? "text-accent font-medium"
                    : "text-ink-muted hover:text-ink transition-colors"
                }
              >
                {formatEditionDate(d)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

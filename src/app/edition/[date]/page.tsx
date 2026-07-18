/**
 * Per-date edition page. Mirrors the homepage but pinned to one edition_date:
 * every section draws ONLY from articles published on that calendar day, so
 * an old edition is a stable snapshot — it never bleeds today's stories.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { HeroCard } from "@/components/HeroCard";
import { MustReadSection } from "@/components/MustReadSection";
import { EditorsPick } from "@/components/EditorsPick";
import { SectionHeader } from "@/components/SectionHeader";
import { CategorySections } from "@/components/CategorySections";
import { InspirationStrip } from "@/components/InspirationStrip";
import { EditionBar } from "@/components/EditionBar";
import { formatEditionDate } from "@/lib/format";
import { getEdition, getArticlesForEdition } from "@/lib/data/queries";
import type { SourceCategory } from "@/data/sources";
import type { Article } from "@/data/articles";

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

  const [edition, dayPool] = await Promise.all([
    getEdition(date),
    getArticlesForEdition(date),
  ]);

  if (!edition) notFound();

  // Must-reads come from a GLOBAL is_must_read flag (today's picks), so on a
  // past edition they'd bleed today's stories in — keep only the ones from
  // this edition's own 48h era. (Tighter than the 7-day section pool on
  // purpose: must-reads are "curator's picks of the day", not of the week.)
  const dayStartMs = Date.parse(`${date}T00:00:00Z`);
  const windowStartMs = dayStartMs - 24 * 60 * 60 * 1000;
  const windowEndMs = dayStartMs + 24 * 60 * 60 * 1000;
  const mustReads = edition.mustReads.filter((m) => {
    const t = Date.parse(m.publishedAt);
    return Number.isFinite(t) && t >= windowStartMs && t < windowEndMs;
  });

  // The day's articles, minus whatever the curated slots already show.
  const shownIds = new Set(
    [
      edition.hero?.id,
      edition.editorsPick?.id,
      ...mustReads.map((m) => m.id),
    ].filter((x): x is string => !!x)
  );
  const pool = dayPool.filter((a) => !shownIds.has(a.id));

  // Headline grid: the day's freshest stories.
  const dayStories = pool.slice(0, 6);

  // Category previews from the SAME era's pool — the sections the homepage
  // has (UX & Thinking, Video, …), pinned to this edition. A category with
  // <2 stories in the window is dropped; whichever categories ARE covered
  // fill the grid (up to 4 blocks, homepage parity).
  const byCategory = (cat: SourceCategory) =>
    pool.filter((a) => a.category === cat).slice(0, 2);
  const gridBlocks = (
    [
      { category: "design-tools", articles: byCategory("design-tools") },
      { category: "ux-thinking", articles: byCategory("ux-thinking") },
      { category: "youtube", articles: byCategory("youtube") },
      { category: "ai-tools", articles: byCategory("ai-tools") },
      { category: "newsletters", articles: byCategory("newsletters") },
      { category: "product", articles: byCategory("product") },
    ] as { category: SourceCategory; articles: Article[] }[]
  )
    .filter((b) => b.articles.length >= 2)
    .slice(0, 4);

  const inspiration = pool
    .filter((a) => a.category === "inspiration")
    .slice(0, 4);

  return (
    <>
      {/* Named edition + date picker + share (replaces the old prev/next nav). */}
      <EditionBar date={edition.date} />

      {edition.hero && (
        <section className="site-container pt-4 pb-16">
          <HeroCard article={edition.hero} />
        </section>
      )}

      {dayStories.length > 0 && (
        <section className="site-container pb-16">
          <SectionHeader
            kicker="In this edition"
            title={`Stories from ${formatEditionDate(edition.date)}`}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-10">
            {dayStories.map((a) => (
              <ArticleCard key={a.id} article={a} variant="default" />
            ))}
          </div>
        </section>
      )}

      {mustReads.length > 0 && (
        <section className="site-container pb-16">
          <MustReadSection articles={mustReads} />
        </section>
      )}

      {edition.editorsPick && (
        <section className="site-container pb-16">
          <EditorsPick article={edition.editorsPick} />
        </section>
      )}

      {/* Same category previews the homepage has, pinned to this day. */}
      <CategorySections blocks={gridBlocks} />

      {inspiration.length >= 2 && (
        <section className="site-container pb-16">
          <InspirationStrip articles={inspiration} />
        </section>
      )}

      {/* No trailing "all editions" list — the edition dropdown in the bar
          above and /archive already cover finding other editions. */}
    </>
  );
}

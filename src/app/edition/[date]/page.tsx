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
import { getEdition, getArticlesForEdition, listEditionDates } from "@/lib/data/queries";
import type { SourceCategory } from "@/data/sources";
import type { Article } from "@/data/articles";
import { SITE_URL } from "@/lib/site";
import { NewsletterCTA } from "@/components/NewsletterCTA";
import { LostState } from "@/components/LostState";

// Real month/day ranges — 2026-99-99 should 404 at the regex, not hit the DB.
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
type Params = { date: string };

// ISR so the CDN can cache edition pages (theme is client-resolved).
export const revalidate = 600;

// Empty list = render each edition on first visit, then serve it from the
// ISR cache. Without generateStaticParams, Next 16 rendered every edition
// visit from scratch (x-vercel-cache: MISS on every request).
export function generateStaticParams(): { date: string }[] {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { date } = await params;
  if (!DATE_RE.test(date)) return { title: "Not found" };
  // Lead with the day's top story: "Edition · Sunday, 15 November 2026" told
  // searchers (and Google) nothing about what the page holds, and edition
  // pages are where search and AI-answer visitors land.
  const edition = await getEdition(date).catch(() => null);
  const day = shortEditionDate(date);
  const url = `/edition/${date}`;
  const top = edition?.hero?.title;
  const title = top ? `${clip(top, 60)} · Designator, ${day}` : `Designator · ${formatEditionDate(date)}`;
  const picks = [edition?.hero, edition?.editorsPick, ...(edition?.mustReads ?? [])]
    .filter((a): a is Article => !!a)
    .map((a) => a.title);
  const unique = [...new Set(picks)].slice(0, 3);
  const description = clip(
    unique.length
      ? `The design briefing for ${day}: ${unique.join("; ")}. Curated daily from 80+ design, UX and product sources.`
      : `Designator's daily design briefing for ${formatEditionDate(date)}, curated from 80+ design, UX and product sources.`,
    300
  );
  return {
    title,
    description,
    // Page-level alternates replace the layout's, so RSS discovery is repeated.
    alternates: { canonical: url, types: { "application/rss+xml": "/api/rss" } },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      publishedTime: `${date}T00:30:00Z`,
      ...(edition?.hero?.thumbnailUrl ? { images: [{ url: edition.hero.thumbnailUrl }] } : {}),
    },
  };
}

/** "17 Nov 2026" — compact enough for a search-result title. */
function shortEditionDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function clip(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

/**
 * schema.org markup: the edition as a CollectionPage whose main entity is the
 * ordered list of curated stories, so search engines and AI answer engines
 * can read what the page is about without parsing the layout.
 */
function editionJsonLd(date: string, stories: Article[]): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Designator · ${formatEditionDate(date)}`,
    url: `${SITE_URL}/edition/${date}`,
    datePublished: date,
    isPartOf: { "@type": "WebSite", name: "Designator", url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: stories.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: a.url,
        name: a.title,
      })),
    },
  };
  // Escape "<" so a title can never close the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
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

  // A real date with no edition (the press rested that day): point to the
  // nearest editions instead of a dead end. Renders inside a 200 page, so it
  // carries noindex.
  if (!edition) {
    const dates = await listEditionDates(5000).catch(() => [] as string[]);
    const before = dates.filter((d) => d < date).sort().at(-1);
    const after = dates.filter((d) => d > date).sort()[0];
    return (
      <LostState
        art="blank"
        kicker="No paper that day"
        title={`No edition went out on ${formatEditionDate(date)}.`}
        body="Some days the press rests. Here are the closest editions:"
        noindex
        actions={[
          ...(before ? [{ href: `/edition/${before}`, label: `← ${shortEditionDate(before)}`, primary: true }] : []),
          ...(after ? [{ href: `/edition/${after}`, label: `${shortEditionDate(after)} →`, primary: true }] : []),
          { href: "/archive", label: "Browse the archive" },
        ]}
      />
    );
  }

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

  const listed = [edition.hero, edition.editorsPick, ...mustReads, ...dayStories]
    .filter((a): a is Article => !!a)
    .filter((a, i, all) => all.findIndex((b) => b.id === a.id) === i);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: editionJsonLd(edition.date, listed) }}
      />
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

      {/* Search and AI-answer visitors land on edition pages, not the
          homepage, so the subscribe ask has to be here too. */}
      <NewsletterCTA />
    </>
  );
}

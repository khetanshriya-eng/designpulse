import { ArticleCard } from "@/components/ArticleCard";
import { HeroCard } from "@/components/HeroCard";
import { MustReadSection } from "@/components/MustReadSection";
import { EditorsPick } from "@/components/EditorsPick";
import { CategorySections } from "@/components/CategorySections";
import { InspirationStrip } from "@/components/InspirationStrip";
import { NewsletterCTA } from "@/components/NewsletterCTA";
import { EditionBar } from "@/components/EditionBar";
import { SectionHeader } from "@/components/SectionHeader";
import { getByCategory, getEdition, getLatest } from "@/lib/data/queries";
import { SOURCES, type SourceCategory } from "@/data/sources";
import type { Article } from "@/data/articles";

// ISR: render statically and revalidate every 10 min so Vercel's CDN serves
// cached HTML (theme is resolved client-side, so no per-request work needed).
// Matches the data layer's 600s unstable_cache windows.
export const revalidate = 600;

export default async function Home() {
  const edition = await getEdition();
  if (!edition) return <EmptyState reason="No edition has been curated yet." />;

  const heroId = edition.hero?.id;
  const pickId = edition.editorsPick?.id;
  const mustReadIds = edition.mustReads.map((m) => m.id);
  const excludeFromLatest = [heroId, pickId, ...mustReadIds].filter(
    (x): x is string => !!x
  );

  // Latest + per-category lists pulled in parallel — each independent.
  const [
    latestArticles,
    aiArticles,
    designTools,
    uxThinking,
    videoItems,
    newsletterItems,
    inspirationItems,
    productItems,
    podcastItems,
  ] = await Promise.all([
    getLatest(6, excludeFromLatest),
    getByCategory("ai-tools", 6, excludeFromLatest),
    getByCategory("design-tools", 2, excludeFromLatest),
    getByCategory("ux-thinking", 2, excludeFromLatest),
    getByCategory("youtube", 2, excludeFromLatest),
    getByCategory("newsletters", 2, excludeFromLatest),
    getByCategory("inspiration", 4),
    getByCategory("product", 2, [pickId].filter((x): x is string => !!x)),
    getByCategory("podcasts", 2),
  ]);

  // Freshness gating (3A): a homepage section only renders if it has enough
  // recent items, so the page never shows a month-old "Design Tools" block.
  // When a design category is starved, the category grid quietly fills with
  // whichever design-leaning categories ARE fresh (3B graceful degradation).
  const WEEK = 168; // hours
  const FORTNIGHT = 336; // podcasts publish less often
  const gridBlocks = (
    [
      { category: "design-tools", articles: designTools },
      { category: "ux-thinking", articles: uxThinking },
      { category: "youtube", articles: videoItems },
      { category: "newsletters", articles: newsletterItems },
    ] as { category: SourceCategory; articles: Article[] }[]
  )
    .filter((b) => freshCount(b.articles, WEEK) >= 2)
    .slice(0, 4);
  const showAi = freshCount(aiArticles, WEEK) >= 2;
  const showInspiration = freshCount(inspirationItems, WEEK) >= 2;
  const showProduct = freshCount(productItems, WEEK) >= 2;
  const showPodcasts = freshCount(podcastItems, FORTNIGHT) >= 2;

  return (
    <>
      {/* Named edition + date picker + prominent share, directly below tabs. */}
      <EditionBar date={edition.date} />

      {/* Hero — starts promptly after the edition bar. */}
      {edition.hero && (
        <section className="site-container pt-4 pb-16">
          <HeroCard article={edition.hero} />
        </section>
      )}

      {/* Latest grid — kicker + description are derived from actual article
          ages so the section never claims freshness it doesn't have. */}
      {latestArticles.length > 0 && (() => {
        const { kicker, description } = describeFreshness(latestArticles);
        return (
          <section className="site-container pb-16">
            <SectionHeader
              kicker={kicker}
              title="Latest in the feed"
              description={description}
              href={`/edition/${edition.date}`}
            />
            <div className="boot grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-10">
              {latestArticles.map((a) => (
                <ArticleCard key={a.id} article={a} variant="default" />
              ))}
            </div>
          </section>
        );
      })()}

      {/* Must read */}
      {edition.mustReads.length > 0 && (
        <section className="site-container pb-16">
          <MustReadSection articles={edition.mustReads} />
        </section>
      )}

      {/* Editor's pick */}
      {edition.editorsPick && (
        <section className="site-container pb-16">
          <EditorsPick article={edition.editorsPick} />
        </section>
      )}

      {/* AI & Tools — featured card + a compact list, so the fast-moving
          category shows ~6 recent items instead of two big static cards. */}
      {showAi && (
        <section className="site-container pb-16">
          <SectionHeader
            kicker="Moving fast"
            title="AI & Tools"
            href="/category/ai-tools"
          />
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            <ArticleCard article={aiArticles[0]} variant="default" />
            <div className="flex flex-col">
              {aiArticles.slice(1, 6).map((a) => (
                <ArticleCard key={a.id} article={a} variant="list" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category previews — design-led, freshness-gated + dynamic: only
          categories with ≥2 items from the last week show, so a starved
          category (e.g. month-old Design Tools) is dropped and the grid fills
          with whichever design-leaning categories ARE fresh. Tech-news is never
          featured here (stays in the feed + its own /category page). */}
      <CategorySections blocks={gridBlocks} />

      {/* Inspiration */}
      {showInspiration && (
        <section className="site-container pb-16">
          <InspirationStrip articles={inspirationItems} />
        </section>
      )}

      {/* Product + Podcasts */}
      {(showProduct || showPodcasts) && (
        <section className="site-container pb-16">
          <div className="grid lg:grid-cols-2 gap-12">
            {showProduct && (
              <div>
                <SectionHeader
                  kicker="Product & startup"
                  title="On the business of building"
                  href="/category/product"
                />
                <div className="flex flex-col">
                  {productItems.map((a) => (
                    <ArticleCard key={a.id} article={a} variant="horizontal" />
                  ))}
                </div>
              </div>
            )}
            {showPodcasts && (
              <div>
                <SectionHeader
                  kicker="Tune in"
                  title="Podcasts worth your commute"
                  href="/category/podcasts"
                />
                <div className="flex flex-col">
                  {podcastItems.map((a) => (
                    <ArticleCard key={a.id} article={a} variant="horizontal" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Email capture — last thing before the footer. */}
      <NewsletterCTA />
    </>
  );
}

const HOUR_MS = 60 * 60 * 1000;
/** How many of these items were published within `hours` (freshness gating). */
function freshCount(items: { publishedAt: string }[], hours: number): number {
  const cutoff = Date.now() - hours * HOUR_MS;
  return items.filter((a) => {
    const t = Date.parse(a.publishedAt);
    return Number.isFinite(t) && t >= cutoff;
  }).length;
}

function EmptyState({ reason }: { reason: string }) {
  return (
    <div className="max-w-[640px] mx-auto px-6 py-32 text-center">
      <p className="font-heading text-2xl text-ink mb-2">No edition yet</p>
      <p className="text-ink-subtle text-sm">{reason}</p>
    </div>
  );
}

/**
 * Derive the kicker + description from the actual age of the displayed
 * articles, so the section can't claim 24-hour freshness when it's
 * really showing week-old content. `newest` drives the kicker label;
 * `oldest` drives the description copy. Hours are rounded once at the
 * top so all branches see the same value.
 */
function describeFreshness(
  articles: { publishedAt: string }[]
): { kicker: string; description: string } {
  const sourceCount = SOURCES.length;
  if (articles.length === 0) {
    return {
      kicker: "What's new",
      description: `Pulling from ${sourceCount} sources.`,
    };
  }

  const now = Date.now();
  const times = articles.map((a) => new Date(a.publishedAt).getTime());
  const oldestHours = Math.round((now - Math.min(...times)) / 36e5);
  const newestHours = Math.round((now - Math.max(...times)) / 36e5);

  // Kicker: only call it "new" if the most-recent article is fresh.
  const kicker = newestHours <= 48 ? "What's new" : "Recent";

  // Description: based on the oldest article's age.
  let description: string;
  if (oldestHours <= 24) {
    description = `Fresh from the past 24 hours across all ${sourceCount} sources.`;
  } else if (oldestHours <= 48) {
    description = `Fresh from the past 2 days across all ${sourceCount} sources.`;
  } else if (oldestHours <= 168) {
    const days = Math.max(2, Math.round(oldestHours / 24));
    description = `Latest from the past ${days} days across all ${sourceCount} sources.`;
  } else {
    description = `Recent highlights across all ${sourceCount} sources.`;
  }

  return { kicker, description };
}

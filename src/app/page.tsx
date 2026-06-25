import { ArticleCard } from "@/components/ArticleCard";
import { HeroCard } from "@/components/HeroCard";
import { MustReadSection } from "@/components/MustReadSection";
import { EditorsPick } from "@/components/EditorsPick";
import { CategoryGrid } from "@/components/CategoryGrid";
import { InspirationStrip } from "@/components/InspirationStrip";
import { NewsletterCTA } from "@/components/NewsletterCTA";
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
    designTools,
    aiTools,
    uxThinking,
    productItems,
    inspirationItems,
    podcastItems,
  ] = await Promise.all([
    getLatest(6, excludeFromLatest),
    getByCategory("design-tools", 2, excludeFromLatest),
    getByCategory("ai-tools", 2, excludeFromLatest),
    getByCategory("ux-thinking", 2, excludeFromLatest),
    getByCategory("product", 2, [pickId].filter((x): x is string => !!x)),
    getByCategory("inspiration", 4),
    getByCategory("podcasts", 2),
  ]);

  return (
    <>
      {/* Hero */}
      {edition.hero && (
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-10">
          <HeroCard article={edition.hero} />
        </section>
      )}

      {/* Latest grid — kicker + description are derived from actual article
          ages so the section never claims freshness it doesn't have. */}
      {latestArticles.length > 0 && (() => {
        const { kicker, description } = describeFreshness(latestArticles);
        return (
          <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <SectionHeader
              kicker={kicker}
              title="Latest in the feed"
              description={description}
              href={`/edition/${edition.date}`}
              hrefLabel="See full edition"
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
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <MustReadSection articles={edition.mustReads} />
        </section>
      )}

      {/* Editor's pick */}
      {edition.editorsPick && (
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-14">
          <EditorsPick article={edition.editorsPick} />
        </section>
      )}

      {/* Category previews — only blocks that filled their 2-card preview are
          shown, laid out 2-up. An odd trailing block spans full width so
          there's never a lonely card or an empty half. */}
      {/* Category previews — design-led. Tech-news is intentionally NOT
          featured here (it stays in the feed + its own /category page) so the
          homepage reads as a design briefing, not a tech feed. */}
      <CategorySections
        blocks={[
          { category: "design-tools", articles: designTools },
          { category: "ux-thinking", articles: uxThinking },
          { category: "ai-tools", articles: aiTools },
        ]}
      />

      {/* Inspiration */}
      {inspirationItems.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-14">
          <InspirationStrip articles={inspirationItems} />
        </section>
      )}

      {/* Product + Podcasts */}
      {(productItems.length > 0 || podcastItems.length > 0) && (
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-14">
          <div className="grid lg:grid-cols-2 gap-12">
            {productItems.length > 0 && (
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
            {podcastItems.length > 0 && (
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

function EmptyState({ reason }: { reason: string }) {
  return (
    <div className="max-w-[640px] mx-auto px-6 py-32 text-center">
      <p className="font-heading text-2xl text-ink mb-2">No edition yet</p>
      <p className="text-ink-subtle text-sm">{reason}</p>
    </div>
  );
}

/**
 * Category previews laid out for completeness. Only blocks that filled their
 * full 2-card preview are shown (a category with <2 is dropped rather than
 * rendered as a lonely card). Blocks render 2-up; if an odd number qualify,
 * the last one spans the full width so there's never an empty half-cell.
 */
function CategorySections({
  blocks,
}: {
  blocks: { category: SourceCategory; articles: Article[] }[];
}) {
  const full = blocks.filter((b) => b.articles.length >= 2);
  if (full.length === 0) return null;
  const lastIsOdd = full.length % 2 === 1;
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-14">
      <div className="boot grid lg:grid-cols-2 gap-x-10 gap-y-12">
        {full.map((b, i) => (
          <div
            key={b.category}
            className={lastIsOdd && i === full.length - 1 ? "lg:col-span-2" : ""}
          >
            <CategoryGrid category={b.category} articles={b.articles} />
          </div>
        ))}
      </div>
    </section>
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

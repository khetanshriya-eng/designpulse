import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { SectionHeader } from "@/components/SectionHeader";
import { CATEGORY_INTRO, CATEGORY_META, type SourceCategory } from "@/data/sources";
import { getCategoryPage } from "@/lib/data/queries";
import { NewsletterCTA } from "@/components/NewsletterCTA";
import { LostState } from "@/components/LostState";

const PAGE_SIZE = 24;

export const VALID_CATEGORIES = Object.keys(CATEGORY_META) as SourceCategory[];

export function isValidCategory(s: string): s is SourceCategory {
  return (VALID_CATEGORIES as string[]).includes(s);
}

/**
 * One page of a category listing. Shared by /category/[slug] (page 1) and
 * /category/[slug]/page/[n]. Paging lives in the path, not ?page=N: reading
 * searchParams makes a route dynamic, which meant every category visit was
 * rendered from scratch instead of served from the ISR cache.
 */
export async function CategoryListing({ slug, page }: { slug: SourceCategory; page: number }) {
  const offset = (page - 1) * PAGE_SIZE;
  const meta = CATEGORY_META[slug];

  const { items, total } = await getCategoryPage(slug, {
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Past the last page (an old link, or the section shrank): say so and
  // offer the way back, rather than a bare not-found. Inside a 200 page, so
  // it carries noindex.
  if (page > totalPages) {
    return (
      <LostState
        mood="end"
        kicker="End of the section"
        title={`That's the end of ${meta.label}.`}
        body={`You've gone past every story we keep here: ${meta.label} has ${totalPages} ${totalPages === 1 ? "page" : "pages"} right now.`}
        noindex
        primary={{ href: `/category/${slug}`, label: "Back to page 1" }}
        secondary={totalPages > 1 ? { href: `/category/${slug}/page/${totalPages}`, label: `Last page (${totalPages})` } : { href: "/", label: "Today's edition" }}
      />
    );
  }

  return (
    <>
    <div className="site-container py-10 sm:py-14">
      <SectionHeader
        as="h1"
        kicker="Category"
        title={meta.label}
        description={
          page === 1
            ? `${CATEGORY_INTRO[slug]} ${total} ${total === 1 ? "story" : "stories"} so far.`
            : `Page ${page}: older stories in ${meta.label.toLowerCase()}.`
        }
      />

      {items.length === 0 ? (
        <p className="text-ink-subtle text-sm py-12">
          No stories yet in this category. Check back tomorrow.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-10">
            {items.map((a) => (
              <ArticleCard key={a.id} article={a} variant="default" />
            ))}
          </div>

          {totalPages > 1 && (
            <Pager
              slug={slug}
              page={page}
              totalPages={totalPages}
              total={total}
            />
          )}
        </>
      )}
    </div>
    {/* Search visitors land here too: give them the subscribe ask. */}
    <NewsletterCTA />
    </>
  );
}

function Pager({
  slug,
  page,
  totalPages,
  total,
}: {
  slug: string;
  page: number;
  totalPages: number;
  total: number;
}) {
  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  return (
    <div className="mt-14 pt-6 border-t border-rule flex items-center justify-between text-[13px]">
      <span className="text-ink-subtle">
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex items-center gap-4">
        {prev ? (
          <Link
            href={prev === 1 ? `/category/${slug}` : `/category/${slug}/page/${prev}`}
            className="text-ink-muted hover:text-accent transition-colors"
          >
            ← Previous
          </Link>
        ) : (
          <span className="text-ink-subtle">← Previous</span>
        )}
        {next ? (
          <Link
            href={`/category/${slug}/page/${next}`}
            className="text-ink-muted hover:text-accent transition-colors"
          >
            Next →
          </Link>
        ) : (
          <span className="text-ink-subtle">Next →</span>
        )}
      </div>
    </div>
  );
}

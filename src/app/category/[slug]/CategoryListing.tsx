import { notFound } from "next/navigation";
import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { SectionHeader } from "@/components/SectionHeader";
import { CATEGORY_META, type SourceCategory } from "@/data/sources";
import { getCategoryPage } from "@/lib/data/queries";
import { NewsletterCTA } from "@/components/NewsletterCTA";

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
  // A page number past the end (or a stale link) is a 404, not an empty page.
  if (page > totalPages) notFound();

  return (
    <>
    <div className="site-container py-10 sm:py-14">
      <SectionHeader
        kicker="Category"
        title={meta.label}
        description={`${total} ${total === 1 ? "story" : "stories"} curated in ${meta.label.toLowerCase()}.`}
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

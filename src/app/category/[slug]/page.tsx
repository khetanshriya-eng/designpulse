import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { SectionHeader } from "@/components/SectionHeader";
import { CATEGORY_META, type SourceCategory } from "@/data/sources";
import { getCategoryPage } from "@/lib/data/queries";

const PAGE_SIZE = 24;

const VALID_CATEGORIES = Object.keys(CATEGORY_META) as SourceCategory[];

function isValidCategory(s: string): s is SourceCategory {
  return (VALID_CATEGORIES as string[]).includes(s);
}

type Params = { slug: string };
type Search = { page?: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidCategory(slug)) return { title: "Not found" };
  const meta = CATEGORY_META[slug];
  return {
    title: `${meta.label} — DesignPulse`,
    description: `Latest in ${meta.label.toLowerCase()} across DesignPulse's curated sources.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  if (!isValidCategory(slug)) notFound();

  const page = Math.max(1, Number(pageStr) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const meta = CATEGORY_META[slug];

  const { items, total } = await getCategoryPage(slug, {
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
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
            href={`/category/${slug}?page=${prev}`}
            className="text-ink-muted hover:text-accent transition-colors"
          >
            ← Previous
          </Link>
        ) : (
          <span className="text-ink-subtle">← Previous</span>
        )}
        {next ? (
          <Link
            href={`/category/${slug}?page=${next}`}
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

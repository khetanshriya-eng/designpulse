import type { Article } from "@/data/articles";
import type { SourceCategory } from "@/data/sources";
import { CategoryGrid } from "./CategoryGrid";

/**
 * Category previews laid out for completeness. Only blocks that filled their
 * full 2-card preview are shown (a category with <2 is dropped rather than
 * rendered as a lonely card). Blocks render 2-up; if an odd number qualify,
 * the last one spans the full width so there's never an empty half-cell.
 * Shared by the homepage and the per-date edition pages.
 */
export function CategorySections({
  blocks,
}: {
  blocks: { category: SourceCategory; articles: Article[] }[];
}) {
  const full = blocks.filter((b) => b.articles.length >= 2);
  if (full.length === 0) return null;
  const lastIsOdd = full.length % 2 === 1;
  return (
    <section className="site-container pb-16">
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

import Link from "next/link";
import type { Article } from "@/data/articles";
import { CATEGORY_META, type SourceCategory } from "@/data/sources";
import { ArticleCard } from "./ArticleCard";

type Props = {
  category: SourceCategory;
  articles: Article[];
};

export function CategoryGrid({ category, articles }: Props) {
  const meta = CATEGORY_META[category];
  if (articles.length === 0) return null;
  return (
    <section
      aria-labelledby={`cat-${category}-heading`}
      className="flex flex-col"
    >
      <header className="flex items-center justify-between mb-4 rule-strong-top pt-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: meta.dotVar }}
            aria-hidden
          />
          <h2
            id={`cat-${category}-heading`}
            className="font-heading text-[1.05rem] sm:text-[1.15rem] font-extrabold tracking-tight text-ink leading-none"
          >
            {meta.label}
          </h2>
        </div>
        <Link
          href={`/category/${category}`}
          className="text-[12px] text-ink-muted hover:text-accent transition-colors"
        >
          More →
        </Link>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-7">
        {articles.slice(0, 2).map((a) => (
          <ArticleCard key={a.id} article={a} variant="medium" />
        ))}
      </div>
    </section>
  );
}

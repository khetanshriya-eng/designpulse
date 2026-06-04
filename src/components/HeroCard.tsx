import Link from "next/link";
import type { Article } from "@/data/articles";
import { CATEGORY_META } from "@/data/sources";
import { SourceBadge } from "./SourceBadge";
import { CategoryDot } from "./CategoryDot";
import { ArticleImage } from "./ArticleImage";
import { formatRelativeTime, formatReadTime } from "@/lib/format";

export function HeroCard({ article }: { article: Article }) {
  const readTime = formatReadTime(article);
  return (
    <Link
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group surface-card block"
    >
      <span
        className="card-stripe"
        style={{ background: CATEGORY_META[article.category].stripeVar }}
        aria-hidden
      />
      <div className="grid md:grid-cols-2 items-stretch">
        {/*
          Image column. `relative` + min-h give the absolutely-positioned
          <img> a height to fill. `items-stretch` makes it match the text
          column's height when the title/summary is long.
        */}
        <div className="relative order-1 min-h-[260px] md:min-h-[360px] overflow-hidden">
          <ArticleImage article={article} fill size="lg" />
        </div>
        <div className="order-2 flex flex-col justify-center gap-4 p-6 sm:p-8">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center bg-lime text-ink px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-pixel font-bold">
              Top story
            </span>
            <CategoryDot category={article.category} />
            <span className="text-[12px] text-ink-subtle">·</span>
            <span className="text-[12px] text-ink-subtle">
              {formatRelativeTime(article.publishedAt)}
            </span>
          </div>
          <h1 className="font-heading text-[1.85rem] sm:text-[2.25rem] md:text-[2.5rem] leading-[1.05] font-bold text-ink tracking-tight group-hover:text-accent transition-colors">
            {article.title}
          </h1>
          <p className="text-[15px] leading-relaxed text-ink-muted max-w-prose">
            {article.summary}
          </p>
          <div className="flex items-center justify-between pt-2">
            <SourceBadge sourceId={article.sourceId} size="md" />
            {readTime && (
              <span className="text-[12px] text-ink-subtle">{readTime}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

import Link from "next/link";
import type { Article } from "@/data/articles";
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
      className="group grid md:grid-cols-2 gap-6 md:gap-10 items-center"
    >
      <div className="order-1 md:order-1">
        <ArticleImage article={article} aspect="wide" size="lg" />
      </div>
      <div className="order-2 md:order-2 flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-2 bg-accent text-white px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-bold rounded-sm">
            Top story
          </span>
          <CategoryDot category={article.category} />
          <span className="text-[12px] text-ink-subtle">·</span>
          <span className="text-[12px] text-ink-subtle">
            {formatRelativeTime(article.publishedAt)}
          </span>
        </div>
        <h1 className="font-heading text-[1.85rem] sm:text-[2.25rem] md:text-[2.5rem] leading-[1.05] font-extrabold text-ink tracking-tight group-hover:text-accent transition-colors">
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
    </Link>
  );
}

import Link from "next/link";
import type { Article } from "@/data/articles";
import { SourceBadge } from "./SourceBadge";
import { CategoryDot } from "./CategoryDot";
import { ArticleImage } from "./ArticleImage";
import { SectionHeader } from "./SectionHeader";
import { formatRelativeTime, formatReadTime } from "@/lib/format";

export function MustReadSection({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  const [primary, ...rest] = articles;
  return (
    <section aria-labelledby="must-read-heading">
      <SectionHeader
        kicker="Curator's picks"
        title="Must read today"
        description="The three pieces worth pausing on, hand-selected from today's edition."
      />
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
        <PrimaryCard article={primary} />
        <div className="flex flex-col gap-6">
          {rest.slice(0, 2).map((a) => (
            <SecondaryCard key={a.id} article={a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PrimaryCard({ article }: { article: Article }) {
  const readTime = formatReadTime(article);
  return (
    <Link
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-4"
    >
      <ArticleImage article={article} aspect="video" size="lg" />
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <SourceBadge sourceId={article.sourceId} size="md" />
          <CategoryDot category={article.category} />
        </div>
        <h3 className="font-heading text-[1.45rem] sm:text-[1.65rem] leading-tight font-extrabold text-ink group-hover:text-accent transition-colors tracking-tight">
          {article.title}
        </h3>
        <p className="text-[14px] leading-relaxed text-ink-muted line-clamp-3">
          {article.summary}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-ink-subtle">
          <span>{formatRelativeTime(article.publishedAt)}</span>
          {readTime && (
            <>
              <span aria-hidden>·</span>
              <span>{readTime}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function SecondaryCard({ article }: { article: Article }) {
  const readTime = formatReadTime(article);
  return (
    <Link
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-4"
    >
      <ArticleImage article={article} aspect="square" size="sm" />
      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <SourceBadge sourceId={article.sourceId} />
          <CategoryDot category={article.category} />
        </div>
        <h3 className="font-heading text-[1.05rem] sm:text-[1.15rem] leading-snug font-bold text-ink group-hover:text-accent transition-colors line-clamp-3">
          {article.title}
        </h3>
        <p className="hidden sm:block text-[13px] leading-relaxed text-ink-muted line-clamp-2">
          {article.summary}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-ink-subtle">
          <span>{formatRelativeTime(article.publishedAt)}</span>
          {readTime && (
            <>
              <span aria-hidden>·</span>
              <span>{readTime}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

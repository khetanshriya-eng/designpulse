import Link from "next/link";
import type { Article } from "@/data/articles";
import { CATEGORY_META } from "@/data/sources";
import { SourceBadge } from "./SourceBadge";
import { CategoryDot } from "./CategoryDot";
import { ArticleImage } from "./ArticleImage";
import { hasRealImage } from "@/lib/article-image";
import { PixelCard } from "./PixelCard";
import { SectionHeader } from "./SectionHeader";
import { formatRelativeTime, formatReadTime } from "@/lib/format";

export function MustReadSection({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  // The big lead card must show a real picture: lead with the first
  // must-read that has one (a placeholder filled the section's largest card,
  // 2026-11-26). Order is otherwise kept.
  const leadIdx = Math.max(0, articles.findIndex(hasRealImage));
  const [primary, ...rest] = [articles[leadIdx], ...articles.filter((_, i) => i !== leadIdx)];
  const secondary = rest.slice(0, 4);
  return (
    <section aria-labelledby="must-read-heading">
      <SectionHeader
        kicker="Curator's picks"
        title="Must read today"
        description="The pieces worth pausing on, hand-selected from today's edition."
      />
      {/* items-stretch + h-full/flex internals keep both columns the same
          height: the big card's image grows, the 4 stacked cards distribute,
          so neither side ever leaves a blank gap. */}
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
        <PrimaryCard article={primary} />
        <div className="flex flex-col gap-5">
          {secondary.map((a) => (
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
    <PixelCard href={article.url} category={article.category} className="h-full">
      <div className="relative flex-1 min-h-[220px]">
        <ArticleImage article={article} fill size="lg" />
      </div>
      <div className="flex flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <SourceBadge sourceId={article.sourceId} size="md" />
          <CategoryDot category={article.category} />
        </div>
        <h3 className="font-heading text-[1.5rem] sm:text-[1.7rem] leading-tight text-ink group-hover:text-accent transition-colors tracking-tight">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-[14px] leading-relaxed text-ink-muted line-clamp-3">
            {article.summary}
          </p>
        )}
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
    </PixelCard>
  );
}

function SecondaryCard({ article }: { article: Article }) {
  const readTime = formatReadTime(article);
  return (
    <div className="group flex-1">
    <Link
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="surface-card flex flex-col h-full"
    >
      <span
        className="card-stripe"
        style={{ background: CATEGORY_META[article.category].stripeVar }}
        aria-hidden
      />
      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[150px_1fr] flex-1">
        <div className="relative min-h-[110px]">
          <ArticleImage article={article} fill size="sm" />
        </div>
        <div className="flex flex-col gap-2 min-w-0 p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <SourceBadge sourceId={article.sourceId} />
            <CategoryDot category={article.category} />
          </div>
          <h3 className="font-title text-[15px] leading-[1.4] text-ink group-hover:text-accent transition-colors line-clamp-3">
            {article.title}
          </h3>
          <div className="flex items-center gap-2 text-[11px] text-ink-subtle mt-auto">
            <span>{formatRelativeTime(article.publishedAt)}</span>
            {readTime && (
              <>
                <span aria-hidden>·</span>
                <span>{readTime}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
    </div>
  );
}

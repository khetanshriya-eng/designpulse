import Link from "next/link";
import type { Article } from "@/data/articles";
import { SourceBadge } from "./SourceBadge";
import { CategoryDot } from "./CategoryDot";
import { ArticleImage } from "./ArticleImage";
import { PixelCard } from "./PixelCard";
import { formatRelativeTime, formatReadTime } from "@/lib/format";

type Variant = "default" | "horizontal" | "compact" | "medium" | "list";

type Props = {
  article: Article;
  variant?: Variant;
};

export function ArticleCard({ article, variant = "default" }: Props) {
  if (variant === "compact") return <CompactCard article={article} />;
  if (variant === "horizontal") return <HorizontalCard article={article} />;
  if (variant === "medium") return <MediumCard article={article} />;
  if (variant === "list") return <ListCard article={article} />;
  return <DefaultCard article={article} />;
}

/**
 * Tight one-line-ish row: small thumb, title, source · time, no summary.
 * Used to pack several items into a small space (e.g. the AI & Tools list).
 */
function ListCard({ article }: { article: Article }) {
  return (
    <Link
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 py-3 border-b border-rule first:border-t items-center"
    >
      <div className="w-14 h-14 shrink-0 relative overflow-hidden">
        <ArticleImage article={article} fill size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-heading text-[1.05rem] leading-[1.3] text-ink group-hover:text-accent transition-colors line-clamp-2">
          {article.title}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-subtle">
          <SourceBadge sourceId={article.sourceId} />
          <span aria-hidden>·</span>
          <span className="whitespace-nowrap">
            {formatRelativeTime(article.publishedAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function DefaultCard({ article }: { article: Article }) {
  const readTime = formatReadTime(article);
  return (
    <PixelCard href={article.url} category={article.category}>
      <ArticleImage article={article} aspect="video" size="md" />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-3">
          <SourceBadge sourceId={article.sourceId} />
          <CategoryDot category={article.category} />
        </div>
        <h3 className="font-heading text-[1.2rem] leading-[1.45] text-ink group-hover:text-accent transition-colors line-clamp-2">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-[13px] leading-relaxed text-ink-muted line-clamp-2">
            {article.summary}
          </p>
        )}
        <div className="flex items-center gap-2 text-[11px] text-ink-subtle pt-1 mt-auto">
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

function MediumCard({ article }: { article: Article }) {
  const readTime = formatReadTime(article);
  return (
    <PixelCard href={article.url} category={article.category}>
      <ArticleImage article={article} aspect="video" size="sm" />
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center justify-between gap-3">
          <SourceBadge sourceId={article.sourceId} />
          <CategoryDot category={article.category} />
        </div>
        {/* Clamp to 2 lines (clean truncation). Equal tile height comes from
            the grid stretch + meta pinned to the bottom, not a min-height. */}
        <h3 className="font-heading text-[1.15rem] leading-[1.45] text-ink group-hover:text-accent transition-colors line-clamp-2">
          {article.title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-ink-subtle pt-0.5 mt-auto">
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

function HorizontalCard({ article }: { article: Article }) {
  const readTime = formatReadTime(article);
  return (
    // Fixed-height row (image fills, text clamped) so every item in the
    // Product / Podcasts lists is the same height. The whole row is one anchor.
    <div className="group border-b border-rule first:border-t">
      <Link
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-4 py-4 items-stretch min-h-[132px]"
      >
        <div className="w-28 sm:w-32 shrink-0 relative overflow-hidden">
          <ArticleImage article={article} fill size="sm" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <SourceBadge sourceId={article.sourceId} />
            <CategoryDot category={article.category} />
          </div>
          <h3 className="font-heading text-[1.1rem] sm:text-[1.2rem] leading-[1.45] text-ink group-hover:text-accent transition-colors line-clamp-2">
            {article.title}
          </h3>
          {article.summary && (
            <p className="hidden sm:block text-[13px] leading-relaxed text-ink-muted line-clamp-2">
              {article.summary}
            </p>
          )}
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
      </Link>
    </div>
  );
}

function CompactCard({ article }: { article: Article }) {
  return (
    <Link
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 items-start"
    >
      <div className="w-14 h-14 shrink-0">
        <ArticleImage article={article} aspect="square" size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <SourceBadge sourceId={article.sourceId} />
        </div>
        <h4 className="font-heading text-[13px] font-semibold leading-snug text-ink group-hover:text-accent transition-colors line-clamp-2">
          {article.title}
        </h4>
      </div>
    </Link>
  );
}

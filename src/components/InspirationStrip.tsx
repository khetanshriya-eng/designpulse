import type { Article } from "@/data/articles";
import { SourceBadge } from "./SourceBadge";
import { ArticleImage } from "./ArticleImage";
import { PixelCard } from "./PixelCard";
import { SectionHeader } from "./SectionHeader";

export function InspirationStrip({ articles }: { articles: Article[] }) {
  // Need at least 2 items to render a strip; otherwise the layout looks
  // off-balance and the "More inspiration" link to the full category page
  // doesn't earn its place. The category page itself still lists everything.
  if (articles.length < 2) return null;

  // Render whatever we actually have, capped at 4. Adapt the grid so 2
  // items take half-width tiles and 3 items take third-width tiles,
  // instead of forcing a 4-col grid with empty trailing cells.
  const items = articles.slice(0, 4);
  const colsClass =
    items.length === 2
      ? "grid-cols-2"
      : items.length === 3
        ? "grid-cols-2 md:grid-cols-3"
        : "grid-cols-2 md:grid-cols-4";

  return (
    <section aria-labelledby="inspiration-heading">
      <SectionHeader
        kicker="Look & feel"
        title="Inspiration picks"
        description="Visual references from across the design web."
        href="/category/inspiration"
        hrefLabel="More inspiration"
      />
      <div className={`boot grid ${colsClass} gap-4 sm:gap-5`}>
        {items.map((a) => (
          <PixelCard key={a.id} href={a.url} category={a.category}>
            <ArticleImage article={a} aspect="portrait" size="md" />
            <div className="p-3 flex flex-col gap-1.5 flex-1">
              <SourceBadge sourceId={a.sourceId} />
              <h3 className="font-heading text-[1rem] leading-[1.45] text-ink group-hover:text-accent transition-colors line-clamp-2">
                {a.title}
              </h3>
            </div>
          </PixelCard>
        ))}
      </div>
    </section>
  );
}

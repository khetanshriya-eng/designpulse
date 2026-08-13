"use client";

import { useState } from "react";
import type { Article } from "@/data/articles";
import { CATEGORY_META, MOSAIC_SOURCE_SLUGS } from "@/data/sources";
import { PixelMosaic } from "./PixelMosaic";

type Aspect = "video" | "square" | "wide" | "portrait";
type Size = "sm" | "md" | "lg";

type Props = {
  article: Article;
  aspect?: Aspect;
  size?: Size;
  className?: string;
  /**
   * When true, the image fills the parent container instead of holding an
   * aspect ratio. Use for the hero card where the image should match the
   * text column's height. Parent MUST be `position: relative` and have
   * a height (e.g. `min-h-[300px]` or via flex `items-stretch`).
   */
  fill?: boolean;
  /**
   * Eager-load with high fetch priority. Set ONLY on the LCP image (the
   * homepage hero) — lazy-loading the largest above-the-fold image delays
   * Largest Contentful Paint.
   */
  priority?: boolean;
  /**
   * Tiny thumbnail (e.g. the 56x56 AI & Tools list strip). Shrinks the
   * fallback to a centered mosaic + the SHORT category label so the
   * graphic+text unit sits dead-center instead of the full label wrapping
   * ragged-left. Set explicitly — do NOT infer from size, since larger
   * cards (Must-read secondary, Product/Podcasts rows) also use size="sm".
   */
  compact?: boolean;
};

const ASPECT: Record<Aspect, string> = {
  video: "aspect-[16/10]",
  square: "aspect-square",
  wide: "aspect-[21/9]",
  portrait: "aspect-[4/5]",
};

// Mosaic sigil size per card size, as a fraction of the fallback area.
const MOSAIC_SIZE: Record<Size, string> = {
  sm: "w-[46%] max-w-[72px]",
  md: "w-[42%] max-w-[112px]",
  lg: "w-[38%] max-w-[150px]",
};

export function ArticleImage({
  article,
  aspect = "video",
  size = "md",
  className = "",
  fill = false,
  priority = false,
  compact = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  // Some sources (e.g. Hugging Face) emit generic title-banner images that
  // look worse than the mosaic — force the fallback for those.
  const prefersMosaic = MOSAIC_SOURCE_SLUGS.has(article.sourceId);
  const hasImage = !!article.thumbnailUrl && !failed && !prefersMosaic;
  const aspectClass = ASPECT[aspect];

  // `fill` mode: the parent already constrains height (e.g. the hero's
  // `items-stretch` grid). Skip the aspect class and just fill the parent.
  const containerSizing = fill
    ? "absolute inset-0"
    : `relative w-full ${aspectClass}`;

  if (hasImage) {
    return (
      <div
        data-image="real"
        className={`${containerSizing} overflow-hidden bg-paper-tint ${className}`}
      >
        {/* alt="" — the card's heading already announces the title; a non-empty
            alt would make screen readers read it twice per card. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.thumbnailUrl ?? ""}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          onError={() => setFailed(true)}
          onLoad={(e) => {
            // Some sources (HN-linked sites, hotlink-blocked CDNs) return a 1x1
            // tracking pixel or a tiny "no image" graphic with HTTP 200 — so
            // onError never fires. Treat an effectively-empty image as missing
            // and fall back to the pixel mosaic, like every other card.
            const img = e.currentTarget;
            if (img.naturalWidth < 32 || img.naturalHeight < 32) setFailed(true);
          }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    );
  }

  // No-image fallback: a generative pixel mosaic seeded by the article id,
  // in the category color, on a themed tile (warm cream by day, deep navy at
  // night — the night dot palette is vivid, so mosaics read as native art on
  // the dark tile). Replaces the old faded favicon.
  // Compact thumbnails use the SHORT label ("AI", "Tools", "Inspo") so it fits
  // one centered line in a ~56px box; larger fallbacks keep the full label.
  const categoryLabel = compact
    ? CATEGORY_META[article.category]?.short ?? article.category
    : CATEGORY_META[article.category]?.label ??
      article.category.replace(/-/g, " ");

  return (
    <div
      data-image="fallback"
      className={`${containerSizing} overflow-hidden flex flex-col items-center justify-center ${compact ? "gap-1" : "gap-2"} ${className}`}
      style={{ background: "var(--mosaic-tile)" }}
    >
      <PixelMosaic
        seed={article.id || article.url}
        category={article.category}
        className={MOSAIC_SIZE[size]}
      />
      <span
        className="font-pixel text-[10px] font-bold uppercase tracking-[0.18em] text-center leading-none max-w-full px-1"
        style={{ color: CATEGORY_META[article.category].dotVar }}
      >
        {categoryLabel}
      </span>
    </div>
  );
}

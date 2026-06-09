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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.thumbnailUrl ?? ""}
          alt={article.title}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    );
  }

  // No-image fallback: a generative pixel mosaic seeded by the article id,
  // in the category color, on a fixed warm-tint tile (fixed, not themed,
  // because it lives inside the always-cream card). Replaces the old faded
  // favicon — reads as a designed sigil, not a missing image.
  const categoryLabel =
    CATEGORY_META[article.category]?.label ?? article.category.replace(/-/g, " ");

  return (
    <div
      data-image="fallback"
      className={`${containerSizing} overflow-hidden flex flex-col items-center justify-center gap-2 ${className}`}
      style={{ background: "#efe9db" }}
    >
      <PixelMosaic
        seed={article.id || article.url}
        category={article.category}
        className={MOSAIC_SIZE[size]}
      />
      <span
        className="font-pixel text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: CATEGORY_META[article.category].dotVar }}
      >
        {categoryLabel}
      </span>
    </div>
  );
}

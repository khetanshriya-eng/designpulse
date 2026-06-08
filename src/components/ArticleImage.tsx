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
  const isVideoOrPod =
    article.contentType === "video" || article.contentType === "podcast-episode";

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
        {isVideoOrPod && <PlayChip kind={article.contentType} />}
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
      {isVideoOrPod && <PlayChip kind={article.contentType} />}
    </div>
  );
}

function PlayChip({
  kind,
}: {
  kind: "video" | "podcast-episode" | string;
}) {
  return (
    <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-black/70 text-white backdrop-blur px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-medium">
      {kind === "video" ? <PlayIcon /> : <PodcastIcon />}
      <span>{kind === "video" ? "Video" : "Podcast"}</span>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}
function PodcastIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    </svg>
  );
}

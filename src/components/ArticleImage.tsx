"use client";

import { useState } from "react";
import type { Article } from "@/data/articles";
import { sourceById, CATEGORY_META, type SourceCategory } from "@/data/sources";
import { faviconUrl } from "@/lib/source-domain";

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

/**
 * Per-category accent for the empty-state fallback. The fallback uses
 * `bg-paper-tint` as its surface (which themes correctly), and overlays
 * the category dot color as a low-opacity favicon + a thin category
 * label. This way the placeholder reads correctly in both light and
 * dark modes without per-theme palettes.
 *
 * The accent values map to the same CSS custom properties that drive
 * the category dots in the rest of the UI, kept in sync via this table.
 */
const CATEGORY_ACCENT_VAR: Record<SourceCategory, string> = {
  "design-tools":   "var(--color-cat-design)",
  "ux-thinking":    "var(--color-cat-thinking)",
  inspiration:      "var(--color-cat-inspiration)",
  youtube:          "var(--color-cat-youtube)",
  product:          "var(--color-cat-product)",
  "tech-news":      "var(--color-cat-tech)",
  "ai-tools":       "var(--color-cat-ai)",
  newsletters:      "var(--color-cat-newsletters)",
  podcasts:         "var(--color-cat-podcasts)",
};

const FAVICON_SIZE: Record<Size, string> = {
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-20 h-20",
};

export function ArticleImage({
  article,
  aspect = "video",
  size = "md",
  className = "",
  fill = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  const source = sourceById(article.sourceId);
  const hasImage = !!article.thumbnailUrl && !failed;
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

  // Minimal fallback. paper-tint bg themes automatically; the favicon and
  // category label use the category accent var which works on either bg.
  const accentVar = CATEGORY_ACCENT_VAR[article.category];
  const categoryLabel = (
    CATEGORY_META[article.category]?.label ?? article.category.replace(/-/g, " ")
  );
  const favicon = faviconUrl(source);

  return (
    <div
      data-image="fallback"
      className={`${containerSizing} overflow-hidden flex flex-col items-center justify-center bg-paper-tint ${className}`}
    >
      {favicon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={favicon}
          alt=""
          aria-hidden
          className={`${FAVICON_SIZE[size]} rounded-full opacity-30`}
        />
      )}
      <span
        className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em]"
        style={{ color: accentVar }}
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

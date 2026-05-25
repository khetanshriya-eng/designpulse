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
 * Per-category palette for the empty-state fallback. Light, paper-like
 * backgrounds with a muted accent ink — the favicon is the visual anchor,
 * a single small category label sits below it. NO article title, source
 * name, or other text that already appears in the card's metadata row.
 */
const CATEGORY_PALETTE: Record<
  SourceCategory,
  { bg: string; accent: string }
> = {
  "design-tools":   { bg: "#EEF2F7", accent: "#1F3A5F" },
  "ux-thinking":    { bg: "#F4ECE0", accent: "#5B3A1F" },
  inspiration:      { bg: "#F2E4F4", accent: "#5B1F5B" },
  youtube:          { bg: "#F8E5E5", accent: "#7A1F1F" },
  product:          { bg: "#E2F0EB", accent: "#1F5B45" },
  "tech-news":      { bg: "#E6EEF5", accent: "#1F3A5F" },
  "ai-tools":       { bg: "#EBE5F4", accent: "#3F1F7A" },
  newsletters:      { bg: "#F0EDE5", accent: "#5B4A1F" },
  podcasts:         { bg: "#F4E2EB", accent: "#7A1F4A" },
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

  // Minimal fallback — favicon + category label only. No title, no source name.
  const palette = CATEGORY_PALETTE[article.category];
  const categoryLabel = (
    CATEGORY_META[article.category]?.label ?? article.category.replace(/-/g, " ")
  );
  const favicon = faviconUrl(source);

  return (
    <div
      className={`${containerSizing} overflow-hidden flex flex-col items-center justify-center ${className}`}
      style={{ backgroundColor: palette.bg }}
    >
      {favicon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={favicon}
          alt=""
          aria-hidden
          className={`${FAVICON_SIZE[size]} rounded-full opacity-20`}
        />
      )}
      <span
        className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60"
        style={{ color: palette.accent }}
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

import type { SourceCategory } from "./sources";

export type ContentType = "article" | "video" | "podcast-episode" | "gallery-item";

export type Article = {
  id: string;
  sourceId: string;
  title: string;
  summary: string;
  url: string;
  author?: string;
  /** ISO timestamp */
  publishedAt: string;
  readMinutes?: number;
  /** for podcasts/videos */
  durationMinutes?: number;
  category: SourceCategory;
  contentType: ContentType;
  isFeatured?: boolean;
  isMustRead?: boolean;
  /** thumbnail accent class — falls back to source swatch */
  swatch?: string;
  /** Real image URL (RSS enclosure/og:image/youtube thumb). Null → typographic fallback. */
  thumbnailUrl?: string | null;
};

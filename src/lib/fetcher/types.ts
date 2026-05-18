import type { ContentType, SourceRow } from "@/lib/db/types";

/**
 * Raw item produced by a fetcher (RSS, YouTube, etc.) before enrichment +
 * summarization. The pipeline normalizes everything to this shape.
 */
export type FetchedItem = {
  sourceId: string;
  sourceSlug: string;
  /** Stable dedupe key. Original article URL or video URL. */
  originalUrl: string;
  title: string;
  /** Description/content snippet from the feed itself. */
  feedDescription: string | null;
  author: string | null;
  /** ISO timestamp from the feed, or null if missing. */
  publishedAt: string | null;
  /** A thumbnail URL pulled from the feed (e.g. YouTube). May be replaced by OG image during enrichment. */
  thumbnailUrl: string | null;
  category: SourceRow["category"];
  contentType: ContentType;
  /** Episode/video duration in minutes, if known from the feed. */
  durationMinutes: number | null;
};

export type FetchResult = {
  sourceSlug: string;
  items: FetchedItem[];
  errors: string[];
  /** Time taken in ms, for logging. */
  durationMs: number;
};

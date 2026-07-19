/**
 * Adapt a Supabase row (snake_case, source_id is a UUID) into the UI's
 * `Article` shape (camelCase, sourceId is the slug — the key the components
 * already use to look up swatches & initials via `sourceById()`).
 *
 * We deliberately keep `src/data/sources.ts` as the visual source of truth for
 * initials/swatches. Mapping UUID → slug here means components don't have to
 * change at all.
 */
import type { Article } from "@/data/articles";
import type { ArticleRow, SourceRow } from "@/lib/db/types";
import { safeHttpUrl } from "@/lib/url";

export type ArticleWithSource = ArticleRow & {
  sources?: SourceRow | SourceRow[] | null;
};

export function rowToArticle(row: ArticleWithSource): Article | null {
  const src = Array.isArray(row.sources) ? row.sources[0] : row.sources;
  if (!src) return null;

  // Scheme guard (defense in depth): the URL becomes an href, the thumbnail a
  // src. Drop the whole card if the link isn't http(s) — a javascript:/data:
  // link is an XSS vector, and a card that can't safely link anywhere is
  // useless. A bad thumbnail just falls back to the pixel mosaic.
  const url = safeHttpUrl(row.original_url);
  if (!url) return null;

  return {
    id: row.id,
    sourceId: src.slug, // UI keys off slug, not UUID
    title: row.title,
    summary: row.summary ?? "",
    url,
    author: row.author ?? undefined,
    publishedAt: row.published_at ?? row.fetched_at,
    readMinutes: row.read_minutes ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    category: row.category,
    contentType: row.content_type,
    isFeatured: row.is_featured,
    isMustRead: row.is_must_read,
    swatch: src.swatch ?? undefined,
    thumbnailUrl: safeHttpUrl(row.thumbnail_url),
  };
}

export function rowsToArticles(rows: ArticleWithSource[]): Article[] {
  return rows
    .map(rowToArticle)
    .filter((a): a is Article => a !== null);
}

import type { SourceRow } from "@/lib/db/types";
import { fetchRssSource } from "./rss";
import { fetchYoutubeSource } from "./youtube";
import type { FetchResult } from "./types";

/**
 * Pick the right fetcher for a source. Sources without a feed_url
 * (email-only newsletters, JS-only galleries) return an empty result with
 * a soft error — the pipeline logs it and moves on.
 */
export async function fetchSource(source: SourceRow): Promise<FetchResult> {
  if (source.type === "youtube") {
    return fetchYoutubeSource(source);
  }
  if (source.feed_url) {
    return fetchRssSource(source);
  }
  return {
    sourceSlug: source.slug,
    items: [],
    errors: [`Source "${source.slug}" has no feed_url and no YouTube channel id.`],
    durationMs: 0,
  };
}

export type { FetchResult } from "./types";
export type { FetchedItem } from "./types";
export { enrichBatch, enrichItem } from "./enrich";
export type { EnrichedItem } from "./enrich";

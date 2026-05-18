import type { SourceRow } from "@/lib/db/types";
import { fetchRssSource } from "./rss";
import type { FetchResult } from "./types";

/**
 * YouTube channels expose RSS at:
 *   https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxxxxxx
 *
 * We just compose that URL from `source.youtube_channel_id` and reuse the
 * generic RSS fetcher. The channel id resolution (from @handle → UC...) is
 * a separate one-time setup step — see scripts/resolve-youtube-channels.ts.
 */
export async function fetchYoutubeSource(source: SourceRow): Promise<FetchResult> {
  if (!source.youtube_channel_id) {
    return {
      sourceSlug: source.slug,
      items: [],
      errors: [
        `Source "${source.slug}" is a YouTube channel but has no youtube_channel_id. ` +
          `Resolve the channel id from the channel page (look for "channelId" in the HTML or use YouTube Data API).`,
      ],
      durationMs: 0,
    };
  }

  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${source.youtube_channel_id}`;
  return fetchRssSource({ ...source, feed_url: feedUrl });
}

import Parser from "rss-parser";
import type { SourceRow } from "@/lib/db/types";
import type { FetchResult, FetchedItem } from "./types";
import { contentTypeForSource, parseDurationToMinutes, stripHtml } from "./util";

// Some fields (like iTunes podcast duration / media thumbnails) aren't part of
// rss-parser's default typed map, so we register them as custom fields.
type CustomItem = {
  "itunes:duration"?: string;
  "itunes:image"?: { $?: { href?: string } } | string;
  "media:thumbnail"?: { $?: { url?: string } } | { $?: { url?: string } }[];
  "media:content"?: { $?: { url?: string } } | { $?: { url?: string } }[];
  "yt:videoId"?: string;
  // Some Atom feeds expose `author`; rss-parser's default typing doesn't.
  author?: string | { name?: string };
};

const parser: Parser<{}, CustomItem> = new Parser({
  // Per-source timeout. Kept tight (8s) so one slow source can't pin a
  // fetch worker for the whole Vercel 60s budget — see incident on
  // prototypr (2026-05-25) where a 20s hang ate the summarize budget.
  // Legitimate sources we observe complete in <1.5s, so 8s is 5x cushion.
  timeout: 8_000,
  headers: {
    "User-Agent":
      "DesignPulse/0.1 (+https://designpulse.app) - friendly RSS reader",
    Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
  },
  customFields: {
    item: [
      "itunes:duration",
      "itunes:image",
      ["media:thumbnail", "media:thumbnail", { keepArray: true }],
      ["media:content", "media:content", { keepArray: true }],
      "yt:videoId",
    ],
  },
});

const FRESH_WINDOW_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const MAX_ITEMS_PER_SOURCE = 12;

/**
 * Fetch and parse a single RSS/Atom feed for a source.
 * Returns at most MAX_ITEMS_PER_SOURCE items from the past FRESH_WINDOW_MS.
 */
export async function fetchRssSource(source: SourceRow): Promise<FetchResult> {
  const started = Date.now();
  const result: FetchResult = {
    sourceSlug: source.slug,
    items: [],
    errors: [],
    durationMs: 0,
  };

  if (!source.feed_url) {
    result.errors.push("Source has no feed_url");
    result.durationMs = Date.now() - started;
    return result;
  }

  try {
    const feed = await parser.parseURL(source.feed_url);
    const now = Date.now();

    for (const raw of feed.items.slice(0, MAX_ITEMS_PER_SOURCE * 2)) {
      const link = raw.link?.trim();
      const title = raw.title?.trim();
      if (!link || !title) continue;

      const publishedIso = raw.isoDate ?? (raw.pubDate ? new Date(raw.pubDate).toISOString() : null);

      // Skip items older than the fresh window
      if (publishedIso) {
        const age = now - new Date(publishedIso).getTime();
        if (Number.isFinite(age) && age > FRESH_WINDOW_MS) continue;
      }

      const description =
        stripHtml(raw.contentSnippet ?? raw.content ?? raw.summary ?? "") || null;

      const item: FetchedItem = {
        sourceId: source.id,
        sourceSlug: source.slug,
        originalUrl: link,
        title: stripHtml(title) || title,
        feedDescription: description,
        author:
          raw.creator ??
          (typeof raw.author === "string"
            ? raw.author
            : raw.author?.name ?? null),
        publishedAt: publishedIso,
        thumbnailUrl: extractThumbnail(raw),
        category: source.category,
        contentType: contentTypeForSource(source),
        durationMinutes: parseDurationToMinutes(raw["itunes:duration"]),
      };

      result.items.push(item);
      if (result.items.length >= MAX_ITEMS_PER_SOURCE) break;
    }
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  result.durationMs = Date.now() - started;
  return result;
}

function extractThumbnail(raw: CustomItem & Parser.Item): string | null {
  // YouTube feeds: prefer the canonical hosted thumbnail derived from videoId.
  // maxresdefault isn't guaranteed to exist for every video; the ArticleImage
  // component will onError-fall back to its typographic placeholder, but the
  // backfill script can also swap to mqdefault when we detect a miss.
  const ytId = raw["yt:videoId"];
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
  }

  if (raw.enclosure?.url && /\.(jpe?g|png|webp|gif)$/i.test(raw.enclosure.url)) {
    return raw.enclosure.url;
  }

  const mt = raw["media:thumbnail"];
  if (Array.isArray(mt)) {
    const url = mt.find((m) => m?.$?.url)?.$?.url;
    if (url) return url;
  } else if (mt && "$" in mt && mt.$?.url) {
    return mt.$.url;
  }
  const mc = raw["media:content"];
  if (Array.isArray(mc)) {
    const url = mc.find((m) => m?.$?.url)?.$?.url;
    if (url) return url;
  } else if (mc && "$" in mc && mc.$?.url) {
    return mc.$.url;
  }

  // iTunes podcast feeds: itunes:image can be either an element with href
  // attribute, or a bare string in some misformed feeds.
  const it = raw["itunes:image"];
  if (typeof it === "string" && it) return it;
  if (it && typeof it === "object" && "$" in it && it.$?.href) {
    return it.$.href;
  }

  return null;
}

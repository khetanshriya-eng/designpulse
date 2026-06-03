import * as cheerio from "cheerio";
import type { FetchedItem } from "./types";
import { readTimeMinutes, stripHtml } from "./util";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RAW_CHARS = 6000;

export type EnrichedItem = FetchedItem & {
  thumbnailUrl: string | null;
  readMinutes: number | null;
  rawContent: string | null;
};

/**
 * Fetch the article page and extract:
 *  - OG image (fallback: twitter:image, first <img>)
 *  - read time (from visible text word count)
 *  - raw content snippet (first ~6000 chars, used later for AI summarization)
 *
 * Gallery items, podcasts and videos skip enrichment — their thumbnail comes
 * from the feed itself, and there's nothing useful to scrape.
 */
export async function enrichItem(item: FetchedItem): Promise<EnrichedItem> {
  // Skip enrichment for non-articles
  if (item.contentType !== "article") {
    return {
      ...item,
      readMinutes: null,
      rawContent: item.feedDescription,
    };
  }

  let html = "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(item.originalUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DesignatorBot/0.1; +https://designpulse-app.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return fallback(item);
    }
    html = await res.text();
  } catch {
    return fallback(item);
  }

  const $ = cheerio.load(html);

  // --- Thumbnail ---
  const ogImage =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    $('meta[property="twitter:image"]').attr("content") ||
    $('link[rel="image_src"]').attr("href") ||
    $("article img").first().attr("src") ||
    null;

  // --- Read time ---
  // Pull text from the most likely content roots, fall back to body.
  const candidates = ["article", "main", '[role="main"]', ".post", ".entry-content", "body"];
  let text = "";
  for (const sel of candidates) {
    const t = $(sel).text();
    if (t && t.length > text.length) text = t;
    if (text.length > 4000) break;
  }
  text = stripHtml(text);
  const words = text ? text.split(/\s+/).length : 0;
  const readMinutes = words > 0 ? readTimeMinutes(words) : null;

  return {
    ...item,
    thumbnailUrl: item.thumbnailUrl || ogImage || null,
    readMinutes,
    rawContent: text ? text.slice(0, MAX_RAW_CHARS) : item.feedDescription,
  };
}

function fallback(item: FetchedItem): EnrichedItem {
  return {
    ...item,
    readMinutes: null,
    rawContent: item.feedDescription,
  };
}

/**
 * Enrich a batch of items with bounded parallelism. RSS targets are often
 * static hosts and tolerate a small parallel burst; default 4 is conservative.
 */
export async function enrichBatch(
  items: FetchedItem[],
  concurrency = 4
): Promise<EnrichedItem[]> {
  const out: EnrichedItem[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await enrichItem(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return out;
}

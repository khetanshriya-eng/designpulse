/**
 * For each source whose configured feed_url returned an error in dry-run,
 * try to auto-discover a working RSS/Atom feed by:
 *   1. Fetching the site homepage and reading <link rel="alternate"> tags
 *   2. Falling back to a list of common feed paths
 *   3. Validating each candidate by HEAD/GET and a content-type or XML sniff
 *
 * Run:
 *   npx tsx scripts/discover-feeds.ts
 *
 * Output is printed as a TS object literal — paste into src/data/sources.ts.
 */
import * as cheerio from "cheerio";
import Parser from "rss-parser";

// Slugs known to be broken from the previous dry-run.
const TARGET_SLUGS = [
  "figma-blog",
  "toools",
  "sidebar",
  "uxtools",
  "prototypr",
  "designmba",
];

const COMMON_PATHS = [
  "/feed",
  "/feed/",
  "/rss",
  "/rss.xml",
  "/feed.xml",
  "/atom.xml",
  "/index.xml",
  "/blog/feed",
  "/blog/feed.xml",
  "/blog/rss",
  "/posts.rss",
];

const UA = "Mozilla/5.0 (compatible; DesignatorBot/0.1; +https://designatorapp.com)";

async function safeFetch(url: string, timeoutMs = 12000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml,*/*" },
    });
    clearTimeout(t);
    return res;
  } catch {
    return null;
  }
}

async function discoverFromHomepage(siteUrl: string): Promise<string[]> {
  const res = await safeFetch(siteUrl);
  if (!res || !res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);

  const out = new Set<string>();
  $('link[rel="alternate"]').each((_, el) => {
    const type = $(el).attr("type") ?? "";
    const href = $(el).attr("href");
    if (!href) return;
    if (
      type.includes("rss") ||
      type.includes("atom") ||
      type.includes("xml")
    ) {
      out.add(new URL(href, siteUrl).toString());
    }
  });
  return Array.from(out);
}

const parser = new Parser({
  timeout: 12000,
  headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9" },
});

async function validateFeed(url: string): Promise<{ ok: boolean; itemCount: number; reason?: string }> {
  try {
    const feed = await parser.parseURL(url);
    return { ok: (feed.items?.length ?? 0) > 0, itemCount: feed.items?.length ?? 0 };
  } catch (err) {
    return { ok: false, itemCount: 0, reason: (err as Error).message };
  }
}

// Hard-coded site URLs per slug (the broken feeds; we know the home pages).
const SLUG_TO_HOMEPAGE: Record<string, string> = {
  "figma-blog":  "https://www.figma.com/blog/",
  "toools":      "https://toools.design/",
  "sidebar":     "https://sidebar.io/",
  "uxtools":     "https://uxtools.co/",
  "prototypr":   "https://prototypr.io/",
  "designmba":   "https://designmba.show/",
};

async function discoverFor(slug: string): Promise<{ slug: string; winning: string | null; tried: { url: string; via: string; ok: boolean; count: number; reason?: string }[] }> {
  const home = SLUG_TO_HOMEPAGE[slug];
  if (!home) return { slug, winning: null, tried: [] };

  const candidates: { url: string; via: string }[] = [];
  // 1. Homepage <link rel="alternate"> hints
  const hinted = await discoverFromHomepage(home);
  for (const u of hinted) candidates.push({ url: u, via: "link rel=alternate" });
  // 2. Common path probes
  const base = new URL(home).origin;
  for (const p of COMMON_PATHS) candidates.push({ url: base + p, via: `probe ${p}` });

  const tried: { url: string; via: string; ok: boolean; count: number; reason?: string }[] = [];
  let winning: string | null = null;

  // Dedupe URLs
  const seen = new Set<string>();
  for (const c of candidates) {
    if (seen.has(c.url)) continue;
    seen.add(c.url);
    const v = await validateFeed(c.url);
    tried.push({ url: c.url, via: c.via, ok: v.ok, count: v.itemCount, reason: v.reason });
    if (v.ok && !winning) {
      winning = c.url;
      break; // first one wins; faster than trying everything
    }
  }
  return { slug, winning, tried };
}

async function main() {
  const results = [] as Awaited<ReturnType<typeof discoverFor>>[];
  for (const slug of TARGET_SLUGS) {
    console.log(`\n# ${slug}`);
    const r = await discoverFor(slug);
    for (const t of r.tried) {
      const tag = t.ok ? "✓" : "✗";
      const detail = t.ok ? `${t.count} items` : (t.reason ?? "no items");
      console.log(`  ${tag} ${t.url}  [${t.via}]  ${detail}`);
      if (t.ok) break; // we logged the winner; stop printing
    }
    if (!r.winning) console.log(`  — no working feed found`);
    results.push(r);
  }

  console.log("\n// Paste into src/data/sources.ts feedUrl fields:");
  console.log("export const RESOLVED_FEED_URLS: Record<string, string | null> = {");
  for (const r of results) {
    console.log(`  "${r.slug}": ${r.winning ? `"${r.winning}"` : "null"},`);
  }
  console.log("};");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

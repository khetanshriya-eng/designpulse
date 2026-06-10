/**
 * Backfill `articles.thumbnail_url` for rows where it's null.
 *
 *   - For YouTube videos (sources.type === "youtube"), we already have the
 *     videoId in the article's original_url (…?v=ID or /watch?v=ID or shorts/
 *     youtu.be paths). Build the maxresdefault URL directly.
 *   - For everything else, fetch the article HTML and scrape og:image /
 *     twitter:image / first article img.
 *
 * Usage:
 *   npm run backfill:images                # process up to 200, 1s delay
 *   npm run backfill:images -- --limit 50
 *   npm run backfill:images -- --dry-run
 *   npm run backfill:images -- --slug verge
 */
import * as cheerio from "cheerio";
import { createServiceClient } from "../src/lib/db/client";

type Args = { limit: number; dryRun: boolean; slug?: string; delayMs: number };

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const out: Args = { limit: 200, dryRun: false, delayMs: 1000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a === "--slug") out.slug = argv[++i];
    else if (a === "--delay") out.delayMs = Number(argv[++i]);
  }
  return out;
}

const FETCH_TIMEOUT_MS = 5000;

function youtubeIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1).split("/")[0] || null;
    }
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const parts = u.pathname.split("/").filter(Boolean);
    const shortsIdx = parts.indexOf("shorts");
    if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
    return null;
  } catch {
    return null;
  }
}

async function scrapeOgImage(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DesignatorBot/0.1; +https://designatorapp.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    return (
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[property="twitter:image"]').attr("content") ||
      $('link[rel="image_src"]').attr("href") ||
      $("article img").first().attr("src") ||
      null
    );
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = parseArgs();
  const supabase = createServiceClient();

  let q = supabase
    .from("articles")
    .select(
      "id, title, original_url, source_id, sources!inner(slug, type, name)"
    )
    .is("thumbnail_url", null)
    .order("published_at", { ascending: false })
    .limit(args.limit);

  if (args.slug) q = q.eq("sources.slug", args.slug);

  const { data, error } = await q;
  if (error) throw error;

  type Row = {
    id: string;
    title: string;
    original_url: string;
    source_id: string;
    sources:
      | { slug: string; type: string; name: string }
      | { slug: string; type: string; name: string }[];
  };
  const rows = (data ?? []) as Row[];
  console.log(
    `Backfilling ${rows.length} article(s)${
      args.dryRun ? " (dry run)" : ""
    } · delay=${args.delayMs}ms`
  );

  let okYt = 0;
  let okOg = 0;
  let miss = 0;

  for (const r of rows) {
    const src = Array.isArray(r.sources) ? r.sources[0] : r.sources;
    let url: string | null = null;
    let path: "yt" | "og" | "miss" = "miss";

    if (src?.type === "youtube") {
      const vid = youtubeIdFromUrl(r.original_url);
      if (vid) {
        url = `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`;
        path = "yt";
      }
    }

    if (!url) {
      url = await scrapeOgImage(r.original_url);
      if (url) path = "og";
    }

    if (!url) {
      miss++;
      console.log(`  · ${r.id.slice(0, 8)} [${src?.slug}] no image found`);
    } else {
      if (path === "yt") okYt++;
      else okOg++;
      if (!args.dryRun) {
        const { error: upErr } = await supabase
          .from("articles")
          .update({ thumbnail_url: url })
          .eq("id", r.id);
        if (upErr) {
          console.warn(`  ! ${r.id.slice(0, 8)} update failed: ${upErr.message}`);
        }
      }
      console.log(
        `  ✓ ${r.id.slice(0, 8)} [${src?.slug}] (${path}) ${url.slice(0, 80)}`
      );
    }

    // Only delay between og:image scrapes — YouTube path doesn't hit the
    // origin server, so no need to rate-limit.
    if (path === "og" && args.delayMs > 0) await sleep(args.delayMs);
  }

  console.log("");
  console.log(`Done. yt=${okYt} og=${okOg} miss=${miss}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

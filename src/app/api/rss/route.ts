/**
 * GET /api/rss
 *
 * Designator's own RSS 2.0 feed of the latest curated articles — so the power
 * users it's built for can pull the briefing into their own reader. No library:
 * Postgres query → XML string. Cached at the CDN for an hour via Cache-Control,
 * so reader polling never hits the DB.
 */
import { getFeedArticles } from "@/lib/data/queries";
import { sourceById, CATEGORY_META, SOURCES } from "@/data/sources";

const SITE = "https://designatorapp.com";

// XML-escape attribute/element text (URLs, category labels).
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Wrap free text in CDATA, neutralising any literal "]]>" so titles/summaries
// with markup or brackets can't break the document.
function cdata(s: string): string {
  return `<![CDATA[${(s ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

export async function GET() {
  const articles = await getFeedArticles(30);
  const now = new Date().toUTCString();

  const items = articles
    .map((a) => {
      const src = sourceById(a.sourceId);
      const pubDate = a.publishedAt
        ? new Date(a.publishedAt).toUTCString()
        : now;
      const category = CATEGORY_META[a.category]?.label ?? a.category;
      return `    <item>
      <title>${cdata(a.title)}</title>
      <link>${esc(a.url)}</link>
      <guid isPermaLink="true">${esc(a.url)}</guid>
      <description>${cdata(a.summary || "")}</description>
      <category>${esc(category)}</category>
      <pubDate>${pubDate}</pubDate>
      <source url="${esc(src.url)}">${esc(src.name)} via Designator</source>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Designator — Daily Design Briefing</title>
    <link>${SITE}</link>
    <description>Curated updates from ${SOURCES.length}+ design, product, and tech sources — summarized so you stay current in under five minutes.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE}/api/rss" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE}/icon.png</url>
      <title>Designator</title>
      <link>${SITE}</link>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // CDN-cache for an hour; the feed only changes when the pipeline runs.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

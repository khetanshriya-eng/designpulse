// TEMP diag (read-only, CRON_SECRET-gated): latest post date for every
// registered feed plus a fixed list of candidate feeds. Delete next commit.
import Parser from "rss-parser";
import { checkCronAuth } from "@/lib/cron-auth";
import { SOURCES } from "@/data/sources";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CANDIDATES = [
  "https://www.typewolf.com/feed",
  "https://abduzeedo.com/rss.xml",
  "https://www.webdesign-inspiration.com/feed",
  "https://fontsinuse.com/rss",
  "https://www.figma.com/blog/feed/atom.xml",
  "https://www.mindtheproduct.com/feed/",
  "https://uxmag.com/feed",
  "https://www.uxmatters.com/index.xml",
  "https://lawsofux.com/rss.xml",
  "https://www.designsystems.com/rss/",
  "https://bradfrost.com/feed/",
  "https://www.nngroup.com/feed/rss/",
  "https://uxdesign.cc/feed",
  "https://medium.com/feed/google-design",
  "https://design.google/feed.xml",
  "https://www.invisionapp.com/inside-design/feed/",
  "https://maggieappleton.com/rss.xml",
  "https://www.joshwcomeau.com/rss.xml",
  "https://every.to/feed",
  "https://www.lukew.com/ff/rss.xml",
];
const UA = "Designator/0.1 (+https://www.designatorapp.com) - friendly RSS reader";

async function probe(url: string) {
  const parser = new Parser();
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { status: r.status };
    const f = await parser.parseString(await r.text());
    const dates = f.items.map((i) => i.isoDate).filter(Boolean).sort().reverse();
    const d30 = f.items.filter((i) => i.isoDate && Date.now() - Date.parse(i.isoDate) < 30 * 864e5).length;
    return { status: r.status, items: f.items.length, latest: dates[0]?.slice(0, 10) ?? null, last30d: d30 };
  } catch (e) {
    return { error: (e as Error).message.slice(0, 80) };
  }
}

export async function GET(req: Request) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;
  const reg = SOURCES.flatMap((s) => {
    const url = s.feedUrl ?? (s.youtubeChannelId ? `https://www.youtube.com/feeds/videos.xml?channel_id=${s.youtubeChannelId}` : null);
    return url ? [{ slug: s.slug, category: s.category, url }] : [];
  });
  const all = [...reg.map((r) => ({ ...r, kind: "registered" })), ...CANDIDATES.map((url) => ({ slug: "", category: "", url, kind: "candidate" }))];
  const out: unknown[] = [];
  for (let i = 0; i < all.length; i += 10) {
    out.push(...(await Promise.all(all.slice(i, i + 10).map(async (a) => ({ ...a, ...(await probe(a.url)) })))));
  }
  return Response.json(out);
}

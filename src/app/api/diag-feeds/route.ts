// TEMP diag: probe two failing feeds from Vercel's network. Fixed URL list
// (no user-supplied URLs), CRON_SECRET-gated. Delete in the follow-up commit.
import Parser from "rss-parser";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

const URLS = [
  "https://tympanus.net/codrops/feed/",
  "https://tympanus.net/codrops/feed",
  "https://feeds.feedburner.com/tympanus",
  "https://www.cssdesignawards.com/sites-of-the-day-feed.xml",
  "https://www.cssdesignawards.com/feed",
  "https://www.cssdesignawards.com/rss",
];
const UAS = {
  current: "Designator/0.1 (+https://designatorapp.com) - friendly RSS reader",
  browser:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  feedly: "Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)",
};

export async function GET(req: Request) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;
  const parser = new Parser();
  const out: unknown[] = [];
  for (const url of URLS) {
    for (const [name, ua] of Object.entries(UAS)) {
      try {
        const r = await fetch(url, {
          headers: { "User-Agent": ua, Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8" },
          signal: AbortSignal.timeout(8000),
          redirect: "follow",
        });
        const body = await r.text();
        let parse: string;
        try {
          const f = await parser.parseString(body);
          parse = `ok ${f.items.length} items; latest: ${f.items[0]?.title ?? "-"} (${f.items[0]?.pubDate ?? "-"})`;
        } catch (e) {
          const lines = body.split("\n");
          parse = `ERR ${(e as Error).message.split("\n")[0]} | line38: ${JSON.stringify((lines[37] ?? "").slice(0, 200))}`;
        }
        out.push({ url, ua: name, status: r.status, type: r.headers.get("content-type"), finalUrl: r.url, head: body.slice(0, 160), parse });
      } catch (e) {
        out.push({ url, ua: name, error: (e as Error).message });
      }
    }
  }
  return Response.json(out);
}

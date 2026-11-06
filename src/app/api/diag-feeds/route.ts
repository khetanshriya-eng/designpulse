// TEMP diag: probe candidate inspiration feeds from Vercel's network. Fixed
// URL list, CRON_SECRET-gated. Delete in the follow-up commit.
import Parser from "rss-parser";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

const URLS = [
  "https://www.lapa.ninja/feed/",
  "https://minimal.gallery/feed/",
  "https://www.siteinspire.com/websites/feed",
  "https://land-book.com/feed",
  "https://httpster.net/rss.xml",
  "https://www.darkmodedesign.com/feed",
  "https://www.cssnectar.com/feed/",
  "https://www.bestfolios.com/feed",
  "https://www.awwwards.com/feed",
];
const UA = "Designator/0.1 (+https://www.designatorapp.com) - friendly RSS reader";

export async function GET(req: Request) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;
  const parser = new Parser({ customFields: { item: [["media:content", "media:content"], ["media:thumbnail", "media:thumbnail"]] } });
  const out = await Promise.all(
    URLS.map(async (url) => {
      try {
        const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
        const body = await r.text();
        try {
          const f = await parser.parseString(body);
          const it = f.items[0] as unknown as Record<string, unknown> | undefined;
          const hasImg = (i: Record<string, unknown>) =>
            Boolean(i.enclosure || i["media:content"] || i["media:thumbnail"] || /<img/i.test(String(i.content ?? "")));
          const recent = f.items.filter((i) => i.isoDate && Date.now() - Date.parse(i.isoDate) < 14 * 864e5).length;
          return { url, status: r.status, items: f.items.length, recent14d: recent, withImage: f.items.filter((i) => hasImg(i as unknown as Record<string, unknown>)).length, latest: it?.title, date: it?.isoDate };
        } catch (e) {
          return { url, status: r.status, parse: (e as Error).message.split("\n")[0], head: body.slice(0, 80) };
        }
      } catch (e) {
        return { url, error: (e as Error).message };
      }
    })
  );
  return Response.json(out);
}

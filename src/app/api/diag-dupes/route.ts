// TEMP diag (read-only, CRON_SECRET-gated): which feed items are "new" on
// every run? Lists items whose original_url isn't stored. Delete next commit.
import { checkCronAuth } from "@/lib/cron-auth";
import { fetchSource } from "@/lib/fetcher";
import { createServiceClient } from "@/lib/db/client";
import type { SourceRow } from "@/lib/db/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;
  const sb = createServiceClient();
  const { data: sources } = await sb.from("sources").select("*").eq("is_active", true);
  const out: { slug: string; url: string; title: string }[] = [];
  const list = (sources ?? []) as SourceRow[];
  for (let i = 0; i < list.length; i += 8) {
    await Promise.all(
      list.slice(i, i + 8).map(async (s) => {
        const r = await fetchSource(s);
        const urls = r.items.map((x) => x.originalUrl);
        if (!urls.length) return;
        const { data } = await sb.from("articles").select("original_url").in("original_url", urls);
        const known = new Set((data ?? []).map((d) => d.original_url as string));
        for (const it of r.items) if (!known.has(it.originalUrl)) out.push({ slug: s.slug, url: it.originalUrl, title: it.title.slice(0, 60) });
      })
    );
  }
  return Response.json(out);
}

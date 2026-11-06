// TEMP diag: show the thumbnails the fetcher now extracts for gallery feeds.
// Read-only (no DB writes), CRON_SECRET-gated. Delete in the follow-up commit.
import { checkCronAuth } from "@/lib/cron-auth";
import { fetchSource } from "@/lib/fetcher";
import { SOURCES } from "@/data/sources";
import type { SourceRow } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;
  const gallery = SOURCES.filter((s) => s.type === "gallery" && s.feedUrl);
  const out = await Promise.all(
    gallery.map(async (s) => {
      const row = {
        id: `diag-${s.slug}`, slug: s.slug, name: s.name, url: s.url, feed_url: s.feedUrl ?? null,
        type: s.type, category: s.category, icon_url: null, initials: s.initials, swatch: s.swatch,
        youtube_channel_id: null, is_active: true, priority: 1, created_at: "", updated_at: "",
      } as SourceRow;
      const r = await fetchSource(row);
      return { slug: s.slug, items: r.items.length, withThumb: r.items.filter((i) => i.thumbnailUrl).length, sample: r.items.slice(0, 2).map((i) => [i.title, i.thumbnailUrl]), errors: r.errors };
    })
  );
  return Response.json(out);
}

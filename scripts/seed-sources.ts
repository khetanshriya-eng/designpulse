/**
 * Seed the `sources` table with every entry in src/data/sources.ts.
 *
 * Usage:
 *   npm run db:seed
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Re-running is safe: upserts on `slug`.
 */
import { createServiceClient } from "../src/lib/db/client";
import { SOURCES } from "../src/data/sources";
import type { SourceInsert } from "../src/lib/db/types";

async function main() {
  const supabase = createServiceClient();

  const rows: SourceInsert[] = SOURCES.map((s) => ({
    slug: s.slug,
    name: s.name,
    url: s.url,
    feed_url: s.feedUrl ?? null,
    type: s.type,
    category: s.category,
    icon_url: null,
    initials: s.initials,
    swatch: s.swatch,
    youtube_channel_id: s.youtubeChannelId ?? null,
    is_active: true,
  }));

  console.log(`Seeding ${rows.length} sources...`);

  // Upsert in one call. Supabase-js limits payload size, but 75 rows is fine.
  const { error, count } = await supabase
    .from("sources")
    .upsert(rows, { onConflict: "slug", count: "exact" });

  if (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }

  console.log(`Upserted ${count ?? rows.length} sources.`);
  console.log(
    "Categories present:",
    Array.from(new Set(rows.map((r) => r.category))).join(", ")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

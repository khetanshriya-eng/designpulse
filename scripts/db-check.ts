/**
 * Quick read-back to confirm rows are landing as expected.
 * Run: tsx --env-file=.env.local scripts/db-check.ts
 */
import { createServiceClient } from "../src/lib/db/client";

async function main() {
  const supabase = createServiceClient();

  const [sourcesRes, articlesRes] = await Promise.all([
    supabase.from("sources").select("*", { count: "exact", head: true }),
    supabase.from("articles").select("*", { count: "exact", head: true }),
  ]);
  console.log(`sources rows : ${sourcesRes.count}`);
  console.log(`articles rows: ${articlesRes.count}`);

  const { data: byCat } = await supabase
    .from("articles")
    .select("category");
  if (byCat) {
    const counts = byCat.reduce<Record<string, number>>((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + 1;
      return acc;
    }, {});
    console.log("\nArticles by category:");
    for (const [cat, n] of Object.entries(counts).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`  ${cat.padEnd(15)} ${n}`);
    }
  }

  const { data: recent } = await supabase
    .from("articles")
    .select("title, published_at, read_minutes, thumbnail_url, category")
    .order("published_at", { ascending: false })
    .limit(5);
  if (recent) {
    console.log("\n5 most recent articles:");
    for (const a of recent) {
      console.log(
        `  · [${a.category}] ${a.title.slice(0, 70)}${a.title.length > 70 ? "…" : ""}`
      );
      console.log(
        `    ${a.published_at} · ${a.read_minutes ?? "?"}min · thumb${a.thumbnail_url ? "✓" : "✗"}`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

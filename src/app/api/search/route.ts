/**
 * GET /api/search?q=<query>
 *
 * Returns up to 20 matching articles by ILIKE on title + summary. The DB-side
 * query lives in `searchArticles` — this handler is just a thin wrapper that:
 *   1. Validates the query length (≥2, ≤120)
 *   2. Joins source slug → display name from the static SOURCES table
 *   3. Returns a trimmed JSON shape the search modal expects
 *
 * Not cached. We want fresh hits as articles get summarized through the day.
 */
import type { NextRequest } from "next/server";
import { searchArticles } from "@/lib/data/queries";
import { sourceById, CATEGORY_META } from "@/data/sources";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 120);
  if (q.trim().length < 2) {
    return Response.json({ results: [] });
  }

  try {
    const articles = await searchArticles(q, 20);
    const results = articles.map((a) => {
      const src = sourceById(a.sourceId);
      return {
        id: a.id,
        title: a.title,
        summary: a.summary,
        url: a.url,
        sourceName: src.name,
        sourceSlug: src.slug,
        category: a.category,
        categoryLabel: CATEGORY_META[a.category]?.label ?? a.category,
        publishedAt: a.publishedAt,
      };
    });
    return Response.json({ results });
  } catch (err) {
    return Response.json(
      { results: [], error: (err as Error).message },
      { status: 500 }
    );
  }
}

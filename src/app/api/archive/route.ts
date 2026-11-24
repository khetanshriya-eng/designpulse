/**
 * GET /api/archive?page=N
 *
 * Paginated past-editions list for the /archive "Load more" button. 20 per
 * page, newest first. Thin wrapper over getArchiveEditions.
 */
import type { NextRequest } from "next/server";
import { getArchiveEditions, listEditionDates } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export async function GET(req: NextRequest) {
  // ?dates=1 → just the edition dates, for the edition picker. One small
  // cached query (the ?all=true path also counts stories per edition, ~3.8 s
  // cold), and cacheable at the edge.
  if (req.nextUrl.searchParams.get("dates") === "1") {
    const dates = await listEditionDates(1000);
    return Response.json(
      { dates },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } }
    );
  }

  // ?all=true → the full list with story counts.
  if (req.nextUrl.searchParams.get("all") === "true") {
    const { editions, total } = await getArchiveEditions(400, 0);
    return Response.json({ editions, total, hasMore: false });
  }

  const raw = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(raw) && raw > 0 ? raw : 1;
  const offset = (page - 1) * PER_PAGE;

  const { editions, total } = await getArchiveEditions(PER_PAGE, offset);
  const hasMore = offset + editions.length < total;

  return Response.json({ editions, page, hasMore });
}

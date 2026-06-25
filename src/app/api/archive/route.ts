/**
 * GET /api/archive?page=N
 *
 * Paginated past-editions list for the /archive "Load more" button. 20 per
 * page, newest first. Thin wrapper over getArchiveEditions.
 */
import type { NextRequest } from "next/server";
import { getArchiveEditions } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export async function GET(req: NextRequest) {
  const raw = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(raw) && raw > 0 ? raw : 1;
  const offset = (page - 1) * PER_PAGE;

  const { editions, total } = await getArchiveEditions(PER_PAGE, offset);
  const hasMore = offset + editions.length < total;

  return Response.json({ editions, page, hasMore });
}

/**
 * GET/POST /api/cron/thumbs: make small WebP thumbnails for recent stories
 * (see src/lib/thumbs.ts). Called by the pipeline after curate and by the
 * GitHub summarize booster. Resumable.
 *
 * Query: ?limit=30&concurrency=4&days=3 (days up to 30 for a backfill).
 * Production needs `Authorization: Bearer $CRON_SECRET`. On Vercel preview
 * deployments it's open (previews sit behind Vercel login), like /api/metrics,
 * so a backfill can be run from a preview. Previews share the database.
 */
import type { NextRequest } from "next/server";
import { runThumbs } from "@/lib/thumbs";
import { logger } from "@/lib/logger";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview") {
    const denied = checkCronAuth(req);
    if (denied) return denied;
  }
  const log = logger("cron.thumbs");
  const q = new URL(req.url).searchParams;
  const clamp = (v: string | null, d: number, max: number) =>
    Math.min(max, Math.max(1, Number(v ?? d) || d));
  try {
    const result = await runThumbs({
      limit: clamp(q.get("limit"), 30, 60),
      concurrency: clamp(q.get("concurrency"), 4, 6),
      days: clamp(q.get("days"), 3, 30),
      budgetMs: 45000,
      log,
    });
    return Response.json({ success: true, ...result });
  } catch (err) {
    const message = (err as Error).message;
    log.error("crashed", { error: message });
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;

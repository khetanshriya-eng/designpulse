/**
 * GET/POST /api/cron/summarize
 *
 * Wired to Vercel Cron via `vercel.json`. Auth: `Authorization: Bearer
 * $CRON_SECRET`. Returns a JSON summary of the run.
 *
 * Optional query params for manual debugging:
 *   ?limit=20&concurrency=3&slug=verge
 */
import type { NextRequest } from "next/server";
import { runSummarize } from "@/lib/pipeline/summarize";
import { logger } from "@/lib/logger";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
// Hobby plan caps at 60s. The summarize runner is resumable — unsummarized
// rows roll over to the next invocation.
export const maxDuration = 60;

async function handle(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const log = logger("cron.summarize");
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const concurrency = Number(url.searchParams.get("concurrency") ?? "3");
    const slug = url.searchParams.get("slug") ?? undefined;
    const result = await runSummarize({ limit, concurrency, slug, log });
    return Response.json({ success: true, ...result });
  } catch (err) {
    const message = (err as Error).message;
    log.error("crashed", { error: message });
    return Response.json(
      { success: false, error: "Summarize pipeline failed", detail: message },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;

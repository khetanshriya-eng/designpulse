/**
 * GET/POST /api/cron/fetch
 *
 * Wired to Vercel Cron via `vercel.json`. Vercel auto-attaches
 * `Authorization: Bearer $CRON_SECRET` to scheduled invocations; manual
 * triggers must do the same. Returns a JSON summary of the run.
 *
 * The actual work is in `src/lib/pipeline/fetch.ts` so the CLI script and
 * cron path can't drift.
 */
import type { NextRequest } from "next/server";
import { runFetch } from "@/lib/pipeline/fetch";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
// Hobby plan caps at 60s. Fetch usually fits but a slow source can push us
// over; the runner upserts on original_url so the next run picks up cleanly.
export const maxDuration = 60;

async function handle(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = logger("cron.fetch");
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const onlyParam = url.searchParams.get("only");
    const concurrencyParam = url.searchParams.get("concurrency");
    const result = await runFetch({
      limit: limitParam ? Number(limitParam) : null,
      only: onlyParam,
      concurrency: concurrencyParam ? Number(concurrencyParam) : undefined,
      log,
    });
    return Response.json({ success: true, ...result });
  } catch (err) {
    const message = (err as Error).message;
    log.error("crashed", { error: message });
    return Response.json(
      { success: false, error: "Fetch pipeline failed", detail: message },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;

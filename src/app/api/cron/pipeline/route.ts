/**
 * GET/POST /api/cron/pipeline
 *
 * Hobby-tier consolidated runner: fetch → summarize → curate in one
 * invocation. Vercel Hobby limits the project to 2 daily crons total, so
 * we collapse the three pipeline steps behind a single endpoint.
 *
 * Hard 60s function budget on Hobby. We give fetch ~30s, summarize ~20s,
 * curate ~5s; if a step times out, the next nightly run picks up where
 * this one left off (the runners are all resumable by design — fetch
 * upserts on original_url, summarize only loads rows where summary IS
 * NULL, curate idempotently resets flags).
 */
import type { NextRequest } from "next/server";
import { runFetch } from "@/lib/pipeline/fetch";
import { runSummarize } from "@/lib/pipeline/summarize";
import { runCurate } from "@/lib/pipeline/curate";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
// Hobby plan caps at 60s.
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

  const log = logger("cron.pipeline");
  const t0 = Date.now();
  const out: Record<string, unknown> = {};

  // Each step is independent re: errors. If one throws we still return
  // partial progress for the others — the next run will retry.
  try {
    // Concurrency 4 fits ~60 RSS sources inside ~15-20s on a Vercel function,
    // leaving room for summarize + curate before the 60s Hobby cap.
    out.fetch = await runFetch({
      concurrency: 4,
      log: logger("cron.pipeline.fetch"),
    });
  } catch (err) {
    out.fetch = { error: (err as Error).message };
    log.error("fetch step failed", { error: (err as Error).message });
  }

  try {
    // Keep limit modest so summarize fits in the remaining budget.
    out.summarize = await runSummarize({
      limit: 25,
      concurrency: 3,
      log: logger("cron.pipeline.summarize"),
    });
  } catch (err) {
    out.summarize = { error: (err as Error).message };
    log.error("summarize step failed", { error: (err as Error).message });
  }

  try {
    out.curate = await runCurate({ log: logger("cron.pipeline.curate") });
  } catch (err) {
    out.curate = { error: (err as Error).message };
    log.error("curate step failed", { error: (err as Error).message });
  }

  const durationMs = Date.now() - t0;
  log.info("pipeline complete", { durationMs });
  return Response.json({ success: true, durationMs, ...out });
}

export const GET = handle;
export const POST = handle;

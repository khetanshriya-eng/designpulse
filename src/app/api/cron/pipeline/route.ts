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
import { sendAdminAlert } from "@/lib/notify";

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
  // Collect step failures so we can send a single consolidated admin
  // alert at the end instead of one per step.
  const failures: { step: string; error: string }[] = [];

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
    const error = (err as Error).message;
    out.fetch = { error };
    log.error("fetch step failed", { error });
    failures.push({ step: "fetch", error });
  }

  try {
    out.summarize = await runSummarize({
      limit: 15,
      concurrency: 3,
      log: logger("cron.pipeline.summarize"),
    });
  } catch (err) {
    const error = (err as Error).message;
    out.summarize = { error };
    log.error("summarize step failed", { error });
    failures.push({ step: "summarize", error });
  }

  try {
    out.curate = await runCurate({ log: logger("cron.pipeline.curate") });
  } catch (err) {
    const error = (err as Error).message;
    out.curate = { error };
    log.error("curate step failed", { error });
    failures.push({ step: "curate", error });
  }

  const durationMs = Date.now() - t0;
  log.info("pipeline complete", { durationMs, failureCount: failures.length });

  // Admin alert: any step that hard-failed is worth an email. We don't
  // alert on partial summarize results (some articles failing to
  // summarize is normal — the next run retries them).
  if (failures.length > 0) {
    await sendAdminAlert({
      subject: `Pipeline failed (${failures.length} step${failures.length === 1 ? "" : "s"})`,
      body: [
        `Run at ${new Date().toISOString()} took ${durationMs}ms.`,
        "",
        "Failed steps:",
        ...failures.map((f) => `  - ${f.step}: ${f.error}`),
        "",
        `Logs: https://vercel.com/dashboard → designpulse-app → Logs, filter by /api/cron/pipeline`,
      ].join("\n"),
    });
  }

  return Response.json({ success: failures.length === 0, durationMs, ...out });
}

export const GET = handle;
export const POST = handle;

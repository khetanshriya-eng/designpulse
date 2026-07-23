/**
 * GET/POST /api/cron/pipeline
 *
 * Hobby-tier consolidated runner. Vercel Hobby limits the project to 2 daily
 * crons total, so we collapse the pipeline behind a single endpoint.
 *
 * Order: on the morning run (?digest=1) the DIGEST SENDS FIRST, then
 * fetch → summarize → curate. The email is the most important, most
 * time-sensitive output and the cheapest step (~2s); the heavy steps
 * (fetch/summarize/curate) have variable latency and can blow the 60s Hobby
 * budget — on 2026-07-23 summarize ran long and the function was killed before
 * the digest (which used to run last) ever fired, so no email went out.
 * Sending first makes delivery independent of that. Freshness cost is
 * negligible: summarize only processes 15 articles/run, so the digest's
 * candidate pool is nearly identical whether it runs before or after this
 * morning's fetch. The evening run (no ?digest) is just fetch/summarize/curate.
 *
 * Hard 60s function budget on Hobby. If a heavy step times out, the next run
 * picks up where this one left off (the runners are resumable — fetch upserts
 * on original_url, summarize only loads rows where summary IS NULL, curate
 * idempotently resets flags).
 */
import type { NextRequest } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { runFetch } from "@/lib/pipeline/fetch";
import { runSummarize } from "@/lib/pipeline/summarize";
import { runCurate } from "@/lib/pipeline/curate";
import { runSendDigest } from "@/lib/newsletter";
import { logger } from "@/lib/logger";
import { sendAdminAlert } from "@/lib/notify";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
// Hobby plan caps at 60s.
export const maxDuration = 60;

/**
 * Race a RESUMABLE step against a deadline so the tail of the pipeline
 * (curate + cache revalidation + the admin alert) always gets its turn —
 * without this, one slow step ate the whole 60s and Vercel killed the
 * function before anything downstream ran (incident 2026-07-23). On timeout
 * the in-flight work is simply abandoned: fetch upserts on original_url and
 * summarize only loads summary-IS-NULL rows, so the next run resumes exactly
 * where this one stopped.
 */
async function withStepDeadline<T>(
  step: Promise<T>,
  deadlineMs: number
): Promise<{ result?: T; timedOut: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      step.then((result) => ({ result, timedOut: false as const })),
      new Promise<{ timedOut: true }>((resolve) => {
        timer = setTimeout(() => resolve({ timedOut: true }), deadlineMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Absolute elapsed-time budgets (ms since function start). Fetch must yield
// by 30s, summarize by 45s — leaving ≥15s for curate, revalidation, the
// admin alert, and the response. The digest (sent first) typically uses ~5s.
const FETCH_BUDGET_AT = 30_000;
const SUMMARIZE_BUDGET_AT = 45_000;

async function handle(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const log = logger("cron.pipeline");
  const t0 = Date.now();
  const out: Record<string, unknown> = {};
  // Collect step failures so we can send a single consolidated admin
  // alert at the end instead of one per step.
  const failures: { step: string; error: string }[] = [];

  // ── Digest FIRST (morning run only) — see the header comment for why. ──
  // A non-send for ANY reason (thrown, or a returned reason like a Buttondown/
  // Resend error / too-few-articles) is pushed to `failures` so it triggers the
  // admin alert — no more silent misses.
  if (new URL(req.url).searchParams.get("digest")) {
    try {
      const result = await runSendDigest({ log: logger("cron.pipeline.digest") });
      out.digest = result;
      // "already sent today" = the idempotency guard doing its job (e.g. the
      // watchdog recovered before this run) — success, not a failure.
      if (!result.sent && result.reason !== "already sent today") {
        failures.push({ step: "digest", error: result.reason ?? "not sent" });
      }
    } catch (err) {
      const error = (err as Error).message;
      out.digest = { error };
      log.error("digest step crashed", { error });
      failures.push({ step: "digest", error });
    }
  }

  // Each step is independent re: errors. If one throws we still return
  // partial progress for the others — the next run will retry.
  try {
    // Concurrency 4 fits ~60 RSS sources inside ~15-20s on a Vercel function.
    const fetched = await withStepDeadline(
      runFetch({ concurrency: 4, log: logger("cron.pipeline.fetch") }),
      Math.max(1_000, t0 + FETCH_BUDGET_AT - Date.now())
    );
    if (fetched.timedOut) {
      out.fetch = { timedOut: true };
      log.error("fetch step hit its deadline — moving on (resumable)");
      failures.push({ step: "fetch", error: "step deadline exceeded" });
    } else {
      out.fetch = fetched.result;
    }
  } catch (err) {
    const error = (err as Error).message;
    out.fetch = { error };
    log.error("fetch step failed", { error });
    failures.push({ step: "fetch", error });
  }

  try {
    const summarized = await withStepDeadline(
      runSummarize({
        limit: 15,
        concurrency: 3,
        log: logger("cron.pipeline.summarize"),
      }),
      Math.max(1_000, t0 + SUMMARIZE_BUDGET_AT - Date.now())
    );
    if (summarized.timedOut) {
      out.summarize = { timedOut: true };
      log.error("summarize step hit its deadline — moving on (resumable)");
      failures.push({ step: "summarize", error: "step deadline exceeded" });
    } else {
      out.summarize = summarized.result;
    }
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

  // Content just changed — bust the site's caches so the NEXT visitor sees the
  // new edition immediately, instead of waiting out the 10-min ISR + data-cache
  // windows (and the stale-while-revalidate double-load on a low-traffic site).
  // expire:0 = immediate expiry, the documented pattern for an external caller
  // (Vercel Cron) hitting a Route Handler. Everything content-facing is tagged
  // "content"; the homepage/archive shells are revalidated by path.
  if (!(out.curate as { error?: string })?.error) {
    try {
      revalidateTag("content", { expire: 0 });
      revalidatePath("/");
      revalidatePath("/archive");
      log.info("caches revalidated after curate");
    } catch (err) {
      log.error("revalidation failed", { error: (err as Error).message });
    }
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

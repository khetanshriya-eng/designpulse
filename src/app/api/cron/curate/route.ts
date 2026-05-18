/**
 * GET/POST /api/cron/curate
 *
 * Wired to Vercel Cron via `vercel.json`. Auth: `Authorization: Bearer
 * $CRON_SECRET`. Returns the picks + edition date.
 *
 * Optional query params for manual debugging:
 *   ?window-hours=72&must-reads=6
 */
import type { NextRequest } from "next/server";
import { runCurate } from "@/lib/pipeline/curate";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
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

  const log = logger("cron.curate");
  try {
    const url = new URL(req.url);
    const windowHours = Number(url.searchParams.get("window-hours") ?? "48");
    const mustReadCount = Number(url.searchParams.get("must-reads") ?? "5");
    const result = await runCurate({ windowHours, mustReadCount, log });
    return Response.json({ success: true, ...result });
  } catch (err) {
    const message = (err as Error).message;
    log.error("crashed", { error: message });
    return Response.json(
      { success: false, error: "Curate pipeline failed", detail: message },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;

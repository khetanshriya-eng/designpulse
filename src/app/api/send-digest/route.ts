/**
 * GET/POST /api/send-digest
 *
 * Manual / on-demand trigger for the daily email digest. The SCHEDULED send is
 * folded into the morning pipeline run (see /api/cron/pipeline) because Vercel
 * Hobby caps the project at 2 cron jobs — both used by the pipeline. This route
 * exists for manual sends and testing. Auth: Authorization: Bearer $CRON_SECRET.
 */
import type { NextRequest } from "next/server";
import { runSendDigest } from "@/lib/newsletter";
import { logger } from "@/lib/logger";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const log = logger("api.send-digest");
  // ?dry=1: full selection + rendering, nothing sent (safe diagnosis).
  // ?to=address: send the real rendered email to ONE address for design
  // review — never touches the subscriber list.
  const params = new URL(req.url).searchParams;
  const dryRun = !!params.get("dry");
  const toRaw = params.get("to") ?? undefined;
  const to =
    toRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toRaw) ? toRaw : undefined;
  try {
    const result = await runSendDigest({ log, dryRun, to });
    const success = result.sent || result.reason === "dry run";
    return Response.json({ success, ...result });
  } catch (err) {
    const message = (err as Error).message;
    log.error("crashed", { error: message });
    return Response.json(
      { success: false, error: "Digest send failed", detail: message },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;

/**
 * POST /api/visit — records one engaged page view (sent by EngagementBeacon
 * once the reader has stayed 5 s or interacted). Always 204; bots and bad
 * input are dropped silently.
 */
import { createServiceClient } from "@/lib/db/client";
import { istToday } from "@/lib/ist";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly/i;
const noContent = () => new Response(null, { status: 204 });

export async function POST(req: Request) {
  if (BOT_UA.test(req.headers.get("user-agent") ?? "")) return noContent();
  const raw = await req.text().catch(() => "");
  if (!raw || raw.length > 1_000) return noContent();

  let body: { v?: unknown; p?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return noContent();
  }
  const visitId = typeof body.v === "string" && /^[a-z0-9]{8,40}$/i.test(body.v) ? body.v : null;
  const path = typeof body.p === "string" && body.p.startsWith("/") ? body.p.slice(0, 300) : null;
  if (!visitId || !path) return noContent();

  try {
    const { error } = await createServiceClient()
      .from("reader_visits")
      .insert({ day: istToday(), visit_id: visitId, path, host: new URL(req.url).host });
    if (error) throw error;
  } catch (err) {
    logger("api.visit").warn("visit not recorded (run migration 0008?)", { error: (err as Error).message });
  }
  return noContent();
}

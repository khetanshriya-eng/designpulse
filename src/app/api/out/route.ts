/**
 * POST /api/out — records one click out to a story (sent by OutboundTracker
 * with navigator.sendBeacon). Always answers 204 so the browser never waits
 * or retries; bad input and bots are dropped silently.
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
  if (!raw || raw.length > 4_000) return noContent();

  let body: { u?: unknown; p?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return noContent();
  }
  const url = typeof body.u === "string" ? body.u.slice(0, 2_000) : "";
  const fromPath = typeof body.p === "string" ? body.p.slice(0, 300) : null;
  let host: string | null = null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return noContent();
    host = new URL(req.url).host;
  } catch {
    return noContent();
  }

  try {
    const svc = createServiceClient();
    const { error } = await svc
      .from("outbound_clicks")
      .insert({ day: istToday(), url, from_path: fromPath, host });
    if (error) throw error;
  } catch (err) {
    logger("api.out").warn("click not recorded (run migration 0007?)", { error: (err as Error).message });
  }
  return noContent();
}

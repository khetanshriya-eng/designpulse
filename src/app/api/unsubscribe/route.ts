/**
 * GET/POST /api/unsubscribe?e=<email>&t=<hmac>
 *
 * Self-hosted unsubscribe for the Resend-delivered digest. GET is the human
 * path (link in the email footer → tiny confirmation page). POST is Gmail's
 * RFC 8058 one-click unsubscribe (List-Unsubscribe-Post header). Both verify
 * the HMAC then set the subscriber to status='unsubscribed' in our own list.
 * The row is KEPT (not deleted) so re-subscribing later is a clean status
 * flip. Idempotent: an unknown/already-off address still gets a success page.
 */
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/db/client";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger("api.unsubscribe");

async function markUnsubscribed(email: string): Promise<"ok" | "error"> {
  try {
    const svc = createServiceClient();
    // Update in place if present. Not-present is fine (idempotent) — we don't
    // create a row just to mark it unsubscribed.
    const { error } = await svc
      .from("subscribers")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
        unsub_reason: "one-click",
      })
      .eq("email", email);
    if (error) throw error;
    log.info("unsubscribed", { email });
    return "ok";
  } catch (err) {
    log.error("unsubscribe write failed", { error: (err as Error).message });
    return "error";
  }
}

/** Tiny inline-styled pixel page — no app shell, loads instantly. */
function page(title: string, message: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Designator</title></head>
<body style="margin:0;background:#f5f0e8;font-family:'Courier New',Courier,monospace;color:#1a1340;">
  <div style="max-width:480px;margin:12vh auto 0;border:3px solid #1a1340;background:#fffaf0;">
    <div style="background:#5b3df5;padding:16px 22px;font-size:22px;font-weight:bold;letter-spacing:-1px;color:#d4ff3f;border-bottom:3px solid #1a1340;">designator <span style="color:#fffaf0;">✦</span></div>
    <div style="padding:22px;">
      <h1 style="font-size:18px;margin:0 0 10px;">${title}</h1>
      <p style="font-size:14px;line-height:1.6;color:#5c5470;margin:0 0 18px;">${message}</p>
      <a href="https://www.designatorapp.com" style="display:inline-block;background:#d4ff3f;color:#1a1340;font-weight:bold;text-decoration:none;padding:9px 16px;border:2px solid #1a1340;font-size:13px;">Back to Designator →</a>
    </div>
  </div>
</body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleUnsubscribe(email: string | null, token: string | null) {
  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return { ok: false as const };
  }
  const result = await markUnsubscribed(email.trim().toLowerCase());
  return { ok: result === "ok", result };
}

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const { ok } = await handleUnsubscribe(params.get("e"), params.get("t"));
  if (!ok) {
    return page(
      "That link didn't work",
      "The unsubscribe link is invalid or expired. Reply to any edition and we'll remove you by hand.",
      400
    );
  }
  return page(
    "You're unsubscribed",
    "No more editions will land in your inbox. Change your mind anytime — subscribing again takes ten seconds."
  );
}

// RFC 8058 one-click (Gmail POSTs here from its own Unsubscribe button).
export async function POST(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const { ok } = await handleUnsubscribe(params.get("e"), params.get("t"));
  return new Response(ok ? "unsubscribed" : "invalid", {
    status: ok ? 200 : 400,
  });
}

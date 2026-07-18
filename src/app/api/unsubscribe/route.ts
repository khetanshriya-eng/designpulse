/**
 * GET/POST /api/unsubscribe?e=<email>&t=<hmac>
 *
 * Self-hosted unsubscribe for the Resend-delivered digest. GET is the human
 * path (link in the email footer → tiny confirmation page). POST is Gmail's
 * RFC 8058 one-click unsubscribe (List-Unsubscribe-Post header). Both verify
 * the HMAC then remove the subscriber from Buttondown (still the list of
 * record). Idempotent: an already-gone subscriber still gets a success page.
 */
import type { NextRequest } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const BUTTONDOWN_API = "https://api.buttondown.com/v1";
const log = logger("api.unsubscribe");

async function removeFromButtondown(
  email: string
): Promise<"removed" | "gone" | "error"> {
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    log.error("BUTTONDOWN_API_KEY not set — cannot unsubscribe");
    return "error";
  }
  const headers = { Authorization: `Token ${apiKey}` };
  // Look up by email (Buttondown accepts email or id in the path), then
  // delete by the canonical id — two steps so we don't depend on
  // delete-by-email semantics.
  const got = await fetch(
    `${BUTTONDOWN_API}/subscribers/${encodeURIComponent(email)}`,
    { headers }
  );
  if (got.status === 404) return "gone";
  if (!got.ok) {
    log.error("subscriber lookup failed", { status: got.status });
    return "error";
  }
  const sub = (await got.json().catch(() => null)) as { id?: string } | null;
  const id = sub?.id ?? encodeURIComponent(email);
  const del = await fetch(`${BUTTONDOWN_API}/subscribers/${id}`, {
    method: "DELETE",
    headers,
  });
  if (del.ok || del.status === 404) {
    log.info("unsubscribed", { email });
    return "removed";
  }
  log.error("subscriber delete failed", { status: del.status });
  return "error";
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
  const result = await removeFromButtondown(email.trim().toLowerCase());
  return { ok: result !== "error", result };
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

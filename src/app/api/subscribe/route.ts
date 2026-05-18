/**
 * POST /api/subscribe
 *
 * Adds an email address to the DesignPulse Buttondown list.
 *
 * Buttondown returns:
 *   - 201 + subscriber object on success
 *   - 400 with detail "already subscribed" if the email is on the list
 *   - 400 with other detail strings for invalid emails / blocked domains
 *
 * We surface "already subscribed" as a soft success so the form doesn't
 * scold returning visitors.
 */
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let payload: { email?: unknown };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  // Cheap email check — Buttondown does the real validation; we just avoid
  // making a round trip for obviously malformed input.
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Valid email required" }, { status: 400 });
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Subscriptions are temporarily unavailable" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch("https://api.buttondown.com/v1/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        type: "regular",
      }),
    });

    if (res.status === 201) {
      return Response.json({
        success: true,
        message: "You're in. First edition lands tomorrow morning.",
      });
    }

    // Treat "already subscribed" as a soft success.
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const detail = JSON.stringify(data).toLowerCase();
    if (res.status === 400 && detail.includes("already")) {
      return Response.json({
        success: true,
        message: "You're already on the list — see you tomorrow morning.",
      });
    }

    // Surface any human-readable detail when present, otherwise generic.
    const message =
      (typeof data.detail === "string" && data.detail) ||
      (typeof data.email_address === "string" && data.email_address) ||
      "Something went wrong";
    return Response.json({ error: message }, { status: 400 });
  } catch {
    return Response.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}

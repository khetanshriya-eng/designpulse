/**
 * POST /api/send-digest
 *
 * Protected endpoint that picks today's top articles and sends them as a
 * Markdown digest via Buttondown's /v1/emails endpoint.
 *
 * Auth: Vercel Crons attach `Authorization: Bearer $CRON_SECRET` automatically
 * when the project has a CRON_SECRET env var. Manual triggers can hit the
 * same header from a shell.
 */
import type { NextRequest } from "next/server";
import {
  generateDigestEmail,
  getTopArticlesForDigest,
} from "@/lib/newsletter";

export const dynamic = "force-dynamic";
// Buttondown calls can be slow; raise the timeout above the default.
export const maxDuration = 60;

function prettyDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function handle(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "BUTTONDOWN_API_KEY is not configured" },
      { status: 503 }
    );
  }

  try {
    const articles = await getTopArticlesForDigest();
    if (articles.length === 0) {
      return Response.json({
        success: false,
        message: "No articles to send",
        sent: 0,
      });
    }

    const { subject, body } = generateDigestEmail(articles, prettyDate(new Date()));

    const res = await fetch("https://api.buttondown.com/v1/emails", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subject, body, status: "sent" }),
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return Response.json(
        { error: "Buttondown rejected the email", detail },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      message: `Digest sent with ${articles.length} article(s)`,
      sent: articles.length,
    });
  } catch (err) {
    return Response.json(
      { error: "Failed to send digest", detail: (err as Error).message },
      { status: 500 }
    );
  }
}

// Vercel Crons issue GET by default; allow POST for ad-hoc manual triggers.
export const GET = handle;
export const POST = handle;

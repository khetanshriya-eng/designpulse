/**
 * Admin alert notifications. Triggered from the cron pipeline when:
 *   - any pipeline step throws (`runFetch`, `runSummarize`, or `runCurate`)
 *   - the previous edition is more than ~36 hours stale at start of a run
 *
 * Visitors of the website never see these — they go straight to the admin
 * inbox configured via `ADMIN_EMAIL`.
 *
 * Transport: Resend's REST API (https://resend.com/docs/api-reference).
 * Free tier: 3,000 emails/month, plenty for our needs. We hit it
 * directly with fetch to avoid pulling in their SDK.
 *
 * Soft-disable: if `RESEND_API_KEY` or `ADMIN_EMAIL` isn't set, the
 * function logs a warning and returns false instead of throwing — local
 * dev shouldn't have to set these to use the rest of the pipeline.
 */
import { logger } from "@/lib/logger";

const log = logger("notify");

export type AdminAlert = {
  subject: string;
  body: string; // Plain text — we don't need HTML for ops mail.
};

export async function sendAdminAlert(alert: AdminAlert): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL ?? "Designator Alerts <onboarding@resend.dev>";

  if (!apiKey || !to) {
    log.warn("admin alert skipped — missing env", {
      hasKey: !!apiKey,
      hasTo: !!to,
      subject: alert.subject,
    });
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `[Designator] ${alert.subject}`,
        text: alert.body,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "<unreadable>");
      log.error("admin alert send failed", { status: res.status, detail });
      return false;
    }
    log.info("admin alert sent", { subject: alert.subject });
    return true;
  } catch (err) {
    log.error("admin alert threw", { error: (err as Error).message });
    return false;
  }
}

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Self-hosted unsubscribe links for the digest (which is delivered via Resend
 * from our own domain — see lib/newsletter.ts — so Buttondown's per-recipient
 * `{{ unsubscribe_url }}` variable never gets substituted). Links are
 * HMAC-signed so nobody can unsubscribe an address they don't control.
 *
 * Secret: UNSUBSCRIBE_SECRET, falling back to CRON_SECRET (always set in
 * prod). Note: rotating the secret invalidates links in already-sent emails —
 * acceptable at current scale, but prefer setting a dedicated
 * UNSUBSCRIBE_SECRET before the list grows.
 */

// www host on purpose: the apex 308-redirects, and Gmail's RFC 8058 one-click
// unsubscribe POST won't reliably follow redirects.
const SITE = "https://www.designatorapp.com";

function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET ?? process.env.CRON_SECRET ?? "";
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", secret())
    .update(normalize(email))
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!secret() || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(unsubscribeToken(email));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function unsubscribeUrl(email: string): string {
  const e = normalize(email);
  return `${SITE}/api/unsubscribe?e=${encodeURIComponent(e)}&t=${unsubscribeToken(e)}`;
}

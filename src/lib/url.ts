/**
 * URL scheme guard for untrusted content.
 *
 * Every article link and image URL originates from external RSS/scraped feeds
 * — untrusted input. A feed that is malicious or compromised could ship a
 * `javascript:` (or `data:`, `vbscript:`, …) URL that, rendered into an
 * `href`/`src`, becomes stored XSS on click. This collapses any input to an
 * absolute http(s) URL or null, and is applied at BOTH ingest (so bad URLs
 * never enter the DB) and render (adapter + email, so any pre-existing row is
 * still safe). No `server-only` import — shared by server ingest and the
 * data adapter.
 */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    // Relative or malformed — reject (feed links are always absolute).
    return null;
  }
}

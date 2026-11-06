/**
 * Canonical public origin. www on purpose: the apex (designatorapp.com)
 * 308-redirects here, so canonicals, sitemap entries, share links and email
 * links should all point at the final host instead of a redirect. Safe to
 * import from client components (no secrets).
 */
export const SITE_URL = "https://www.designatorapp.com";

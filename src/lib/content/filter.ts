/**
 * Off-brand content filter.
 *
 * Designator is "a daily briefing for product designers" — but high-volume
 * feeds (Wired, The Verge, 9to5Google) mix in deal roundups, gadget reviews,
 * and shopping listicles that read like a tech-store flyer. This module flags
 * those by title/URL pattern so they can be dropped from the feed.
 *
 * Used at three layers (defense in depth, no DB column required):
 *   1. fetch pipeline — blocked items are never inserted (the clean default);
 *   2. curation eligibility — can never become hero / must-read;
 *   3. display pool — hides any that slipped in before this filter existed.
 *
 * Pure + framework-free so it runs in the fetcher, the curator, and queries.
 */

const BLOCKED_TITLE_PATTERNS: RegExp[] = [
  /\bdeals?\b/i,
  /\bsale\b/i,
  /\bprime day\b/i,
  /\bblack friday\b/i,
  /\bcyber monday\b/i,
  /\bdiscount(s|ed)?\b/i,
  /\bcoupon\b/i,
  /\bhalf[- ]off\b/i,
  /\b\d+%\s*off\b/i,
  /\bbuy\s+(one|1)\s+get\b/i,
  /\bbest\s+\d+\s+/i, // "Best 29 deals", "Best 16 powders"
  /\bworth shopping\b/i,
  /\bworth buying\b/i,
  /\bgift guide\b/i,
  /\bon sale\b/i,
  /\b(save|grab)\s+\$?\d+/i, // "Save $50", "Grab 30"
];

const BLOCKED_URL_PATTERNS: RegExp[] = [
  /\/gallery\//i, // Wired listicle/product galleries
  /\/story\/[^/]*deal/i,
  /\/story\/[^/]*prime-day/i,
  /\/story\/[^/]*sale/i,
  /\/deals?\//i,
];

/**
 * True if the article looks like a deal / shopping / listicle item that
 * doesn't belong in a design briefing.
 */
export function isOffBrand(title: string | null, url: string | null): boolean {
  const t = title ?? "";
  for (const re of BLOCKED_TITLE_PATTERNS) if (re.test(t)) return true;
  const u = url ?? "";
  for (const re of BLOCKED_URL_PATTERNS) if (re.test(u)) return true;
  return false;
}

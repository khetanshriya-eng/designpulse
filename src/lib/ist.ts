/**
 * The editorial day is the IST calendar day: the homepage rolls at IST
 * midnight, digest_log is keyed by it, and editions must be too. Using the
 * UTC date for editions meant any curate run between 18:30 and 24:00 UTC
 * (00:00–05:30 IST) rewrote the previous day's edition.
 */
export const IST_OFFSET_MS = 5.5 * 3_600_000;

export function istToday(now: number = Date.now()): string {
  return new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
}

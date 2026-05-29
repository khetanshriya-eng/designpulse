/**
 * Relative timestamp for article cards. We use the explicit "17 hours ago"
 * instead of the compact "17h ago" because at certain values (e.g. "17h ago")
 * the compact form reads as a calendar date ("17" + month-letter), and the
 * confusion is real — reported by a user 2026-05-29 thinking a 17-hour-old
 * article was actually published on May 17.
 *
 * Older than a week falls back to an absolute date so a 3-month-old item
 * doesn't show up as a vague "12 weeks ago".
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return then.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatEditionDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatReadTime(a: {
  readMinutes?: number;
  durationMinutes?: number;
  contentType: string;
}): string | null {
  if (a.contentType === "video" || a.contentType === "podcast-episode") {
    return a.durationMinutes ? `${a.durationMinutes} min listen/watch` : null;
  }
  return a.readMinutes ? `${a.readMinutes} min read` : null;
}

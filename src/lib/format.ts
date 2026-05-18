export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
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

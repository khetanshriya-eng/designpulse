import type { SourceRow, ContentType } from "@/lib/db/types";

const HTML_TAG = /<[^>]+>/g;
const EXTRA_WS = /\s+/g;

export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(HTML_TAG, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(EXTRA_WS, " ")
    .trim();
}

export function contentTypeForSource(source: SourceRow): ContentType {
  switch (source.type) {
    case "youtube":
      return "video";
    case "podcast":
      return "podcast-episode";
    case "gallery":
      return "gallery-item";
    default:
      return "article";
  }
}

/**
 * Parse iTunes / podcast duration strings into whole minutes.
 * Accepts: "32:14", "1:02:30", "1830" (seconds), "PT32M14S".
 * Returns null if it can't make sense of the input.
 */
export function parseDurationToMinutes(
  raw: string | undefined | null
): number | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Plain seconds
  if (/^\d+$/.test(s)) {
    return Math.max(1, Math.round(parseInt(s, 10) / 60));
  }

  // HH:MM:SS or MM:SS
  if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(s)) {
    const parts = s.split(":").map((p) => parseInt(p, 10));
    let seconds = 0;
    if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
    return seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : null;
  }

  // ISO 8601 duration (PT1H2M30S)
  const iso = s.match(/^P?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (iso) {
    const h = parseInt(iso[1] ?? "0", 10);
    const m = parseInt(iso[2] ?? "0", 10);
    const sec = parseInt(iso[3] ?? "0", 10);
    const total = h * 60 + m + Math.round(sec / 60);
    return total > 0 ? total : null;
  }

  return null;
}

/**
 * Estimate read time in whole minutes from a word count.
 * Uses 220 wpm (industry standard for general non-fiction).
 */
export function readTimeMinutes(words: number): number {
  return Math.max(1, Math.round(words / 220));
}

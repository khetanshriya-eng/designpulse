import type { Source } from "@/data/sources";

/**
 * Resolve the favicon domain for a source. YouTube channels all share the
 * same favicon (youtube.com); everything else is the host of the source's
 * own URL.
 */
export function sourceDomain(source: Source): string {
  if (source.type === "youtube") return "youtube.com";
  try {
    return new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function faviconUrl(source: Source, size = 128): string {
  const domain = sourceDomain(source);
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

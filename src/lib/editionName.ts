/**
 * Deterministic, quirky name for each daily edition — same date always yields
 * the same name (no DB, no API). Used in the edition bar + picker.
 */
const ADJECTIVES = [
  "Caffeinated", "Pixelated", "Glitchy", "Crisp", "Buttery", "Snappy",
  "Wired", "Loud", "Quiet", "Bold", "Lo-fi", "Hi-res", "Chunky",
  "Slick", "Fresh", "Rogue", "Neon", "Retro", "Hyper", "Mellow",
];

const NOUNS = [
  "Dispatch", "Briefing", "Download", "Transmission", "Roundup", "Digest",
  "Bulletin", "Drop", "Feed", "Signal", "Broadcast", "Memo", "Scroll",
  "Bundle", "Edit", "Cut", "Mix", "Pulse", "Loop", "Patch",
];

/** e.g. getEditionName("2026-06-28") → "The Crisp Bulletin". */
export function getEditionName(dateStr: string): string {
  const seed = dateStr
    .split("-")
    .reduce((acc, n) => acc + (parseInt(n, 10) || 0), 0);
  const adj = ADJECTIVES[seed % ADJECTIVES.length];
  const noun = NOUNS[(seed * 7) % NOUNS.length];
  return `The ${adj} ${noun}`;
}

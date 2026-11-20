/**
 * Why is this URL a dead end? One shape-only classifier shared by
 * src/proxy.ts (to send a real 404 before rendering) and the not-found page
 * (to tell the reader what happened). Shared so the two can never disagree.
 * Shape only, no database: before-launch, future and no-edition dates are
 * handled inside the edition page, which can show real editions instead.
 */
import { CATEGORY_META } from "@/data/sources";

export const FIRST_EDITION = "2026-05-18";
const IST_OFFSET_MS = 5.5 * 3_600_000;
const CATEGORIES = new Set(Object.keys(CATEGORY_META));

export type LostReason = "bad-date" | "bad-section" | "bad-page";

export type Lost = { reason: LostReason; detail?: string };

/** A real calendar date in YYYY-MM-DD form (rejects e.g. 2026-02-31). */
export function isRealDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const t = Date.parse(`${date}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === date;
}

export function todayIst(now: number = Date.now()): string {
  return new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// Real dates before launch or in the future are NOT dead ends here: the
// edition page explains them and shows real editions to read instead.
function editionProblem(date: string): Lost | null {
  return isRealDate(date) ? null : { reason: "bad-date" };
}

/** null = the URL's shape is fine; otherwise why it can't exist. */
export function classifyLostPath(pathname: string): Lost | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "category") {
    if (!parts[1] || !CATEGORIES.has(parts[1])) return { reason: "bad-section" };
    if (parts.length === 2) return null;
    if (parts.length === 4 && parts[2] === "page" && /^[1-9]\d{0,4}$/.test(parts[3])) return null;
    return { reason: "bad-page", detail: parts[1] };
  }
  if (parts[0] === "edition") {
    return parts.length === 2 ? editionProblem(parts[1]) : { reason: "bad-date" };
  }
  return null;
}

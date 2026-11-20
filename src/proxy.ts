/**
 * Real 404 status for invalid category and edition URLs.
 *
 * The root loading.tsx makes pages stream, so a notFound() thrown inside a
 * page arrives after the 200 status line is already sent: invalid URLs showed
 * the not-found page (with noindex) but answered HTTP 200, which search
 * engines treat as a "soft 404". URLs we can reject from their shape alone are
 * rewritten here, before any rendering, to a path no route matches, so Next
 * serves the not-found page with a genuine 404.
 *
 * Shape checks only (no database): data-dependent misses, such as a page
 * number past the end, still render the soft not-found page.
 */
import { NextResponse, type NextRequest } from "next/server";
import { CATEGORY_META } from "@/data/sources";

const CATEGORIES = new Set(Object.keys(CATEGORY_META));
const FIRST_EDITION = "2026-05-18";
const IST_OFFSET_MS = 5.5 * 3_600_000;

type Lost = { reason: string; detail?: string };

function editionProblem(date: string): Lost | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { reason: "bad-date" };
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== date) return { reason: "bad-date" }; // e.g. 2026-02-31
  const todayIst = new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
  if (date < FIRST_EDITION) return { reason: "before-launch", detail: date };
  if (date > todayIst) return { reason: "future-edition", detail: date };
  return null;
}

/** null = looks valid; otherwise why not (shown to the reader by not-found.tsx). */
function problem(pathname: string): Lost | null {
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

export function proxy(request: NextRequest) {
  const lost = problem(request.nextUrl.pathname);
  if (!lost) return NextResponse.next();
  // Tell not-found.tsx why, so it can say something specific and useful.
  const headers = new Headers(request.headers);
  headers.set("x-lost-reason", lost.reason);
  if (lost.detail) headers.set("x-lost-detail", lost.detail);
  return NextResponse.rewrite(new URL("/__not-found", request.url), { request: { headers } });
}

export const config = {
  matcher: ["/category/:path*", "/edition/:path*"],
};

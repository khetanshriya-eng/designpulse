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

function isValidEditionDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== date) return false; // e.g. 2026-02-31
  const todayIst = new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
  return date >= FIRST_EDITION && date <= todayIst;
}

function isValid(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "category") {
    if (!parts[1] || !CATEGORIES.has(parts[1])) return false;
    if (parts.length === 2) return true;
    return parts.length === 4 && parts[2] === "page" && /^[1-9]\d{0,4}$/.test(parts[3]);
  }
  if (parts[0] === "edition") {
    return parts.length === 2 && isValidEditionDate(parts[1]);
  }
  return true;
}

export function proxy(request: NextRequest) {
  if (isValid(request.nextUrl.pathname)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/__not-found", request.url));
}

export const config = {
  matcher: ["/category/:path*", "/edition/:path*"],
};

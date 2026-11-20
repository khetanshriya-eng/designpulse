/**
 * Real 404 status for category and edition URLs that can't exist.
 *
 * The root loading.tsx makes pages stream, so a notFound() thrown inside a
 * page arrives after the 200 status line is already sent ("soft 404"). URLs
 * we can reject from their shape alone are rewritten here, before any
 * rendering, to a path no route matches, so Next serves the not-found page
 * with a genuine 404. The not-found page re-runs the same classifier on the
 * address the reader visited to explain what happened (lib/lost.ts).
 */
import { NextResponse, type NextRequest } from "next/server";
import { classifyLostPath } from "@/lib/lost";

export function proxy(request: NextRequest) {
  if (!classifyLostPath(request.nextUrl.pathname)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/__not-found", request.url));
}

export const config = {
  matcher: ["/category/:path*", "/edition/:path*"],
};

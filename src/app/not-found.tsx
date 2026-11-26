"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LostState } from "@/components/LostState";
import { CATEGORY_META } from "@/data/sources";
import { classifyLostPath } from "@/lib/lost";

/**
 * Not-found page (served with a real 404 status). Readers see what happened
 * and what to do next, never a status code.
 *
 * Client component on purpose: it reads the address the reader actually
 * visited (usePathname) and classifies it with the same rules as proxy.ts.
 * Reading request headers on the server instead made this boundary dynamic,
 * which broke every ISR-cached edition and category page with "static to
 * dynamic at runtime" 500s (caught on staging, 2026-11-20).
 */
export default function NotFound() {
  const lost = classifyLostPath(usePathname() ?? "");

  if (lost?.reason === "bad-section") {
    return (
      <LostState
        mood="blank"
        kicker="Wrong section"
        title="We don't run that section."
        body="Pick one of the sections Designator covers:"
        extra={
          <ul className="flex max-w-[600px] flex-wrap gap-2.5">
            {Object.entries(CATEGORY_META).map(([slug, meta]) => (
              <li key={slug}>
                <Link
                  href={`/category/${slug}`}
                  className="surface-card inline-flex h-10 items-center px-3.5 font-pixel font-pixel-sm text-[13px] uppercase tracking-[0.08em] text-ink"
                >
                  {meta.label}
                </Link>
              </li>
            ))}
          </ul>
        }
      />
    );
  }

  if (lost?.reason === "bad-page") {
    const meta = CATEGORY_META[lost.detail as keyof typeof CATEGORY_META];
    return (
      <LostState
        mood="blank"
        kicker="Lost the page"
        title="That page doesn't exist."
        body={
          meta
            ? `Start from the top of ${meta.label} instead.`
            : "Start from today's edition instead."
        }
        primary={
          meta
            ? {
                href: `/category/${lost.detail}`,
                label: `${meta.label}, page 1`,
              }
            : { href: "/", label: "Today's edition" }
        }
        secondary={meta ? { href: "/", label: "Today's edition" } : undefined}
      />
    );
  }

  if (lost?.reason === "bad-date") {
    return (
      <LostState
        mood="blank"
        kicker="Off the calendar"
        title="We can't read that date."
        body={
          <>
            Edition links look like{" "}
            <span className="font-pixel text-ink">/edition/2026-11-20</span>.
            Pick a day from the archive instead.
          </>
        }
        primary={{ href: "/", label: "Today's edition" }}
        secondary={{ href: "/archive", label: "Browse the archive" }}
      />
    );
  }

  return (
    <LostState
      mood="blank"
      kicker="Off the page"
      title="This page isn't in any edition."
      body="The link may be old or mistyped. Nothing's wrong on your end."
      primary={{ href: "/", label: "Today's edition" }}
      secondary={{ href: "/archive", label: "Browse the archive" }}
    />
  );
}

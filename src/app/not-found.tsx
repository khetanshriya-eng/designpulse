import Link from "next/link";
import { headers } from "next/headers";
import { LostState } from "@/components/LostState";
import { NewsletterCTA } from "@/components/NewsletterCTA";
import { CATEGORY_META } from "@/data/sources";
import { formatEditionDate } from "@/lib/format";

/**
 * Not-found page (served with a real 404 status). Readers see what happened
 * and what to do next, never a status code. src/proxy.ts passes the reason
 * for URLs it can judge from their shape; anything else gets the general
 * "not in any edition" state.
 */
export default async function NotFound() {
  const h = await headers();
  const reason = h.get("x-lost-reason");
  const detail = h.get("x-lost-detail") ?? "";

  if (reason === "future-edition") {
    return (
      <LostState
        art="press"
        kicker="Still on the press"
        title={`The ${formatEditionDate(detail)} edition isn't out yet.`}
        body="Each edition drops at 6 am IST. Get it in your inbox the moment it's ready, or read today's."
        actions={[{ href: "/", label: "Read today's edition", primary: true }]}
      >
        <NewsletterCTA />
      </LostState>
    );
  }

  if (reason === "before-launch") {
    return (
      <LostState
        art="blank"
        kicker="Before our time"
        title="Designator wasn't printing yet."
        body={`The first edition went out on ${formatEditionDate("2026-05-18")}.`}
        actions={[
          { href: "/edition/2026-05-18", label: "Read the first edition", primary: true },
          { href: "/archive", label: "Browse the archive" },
        ]}
      />
    );
  }

  if (reason === "bad-section") {
    return (
      <LostState
        art="blank"
        kicker="Wrong section"
        title="We don't run that section."
        body="Here's everything Designator covers:"
      >
        <ul className="flex flex-wrap justify-center gap-2">
          {Object.entries(CATEGORY_META).map(([slug, meta]) => (
            <li key={slug}>
              <Link
                href={`/category/${slug}`}
                className="surface-card inline-block font-pixel text-[12px] uppercase tracking-[0.08em] px-3 py-1.5 text-ink"
              >
                {meta.label}
              </Link>
            </li>
          ))}
        </ul>
      </LostState>
    );
  }

  if (reason === "bad-page") {
    const meta = CATEGORY_META[detail as keyof typeof CATEGORY_META];
    return (
      <LostState
        art="blank"
        kicker="Lost the page"
        title="That page number doesn't exist."
        body={meta ? `Start from the top of ${meta.label} instead.` : "Start from today's edition instead."}
        actions={[
          meta
            ? { href: `/category/${detail}`, label: `${meta.label}, page 1`, primary: true }
            : { href: "/", label: "Today's edition", primary: true },
        ]}
      />
    );
  }

  if (reason === "bad-date") {
    return (
      <LostState
        art="blank"
        kicker="Off the calendar"
        title="That isn't a date we can find."
        body={
          <>
            Edition links look like <span className="font-pixel text-ink">/edition/2026-11-20</span>. Pick
            a day from the archive instead.
          </>
        }
        actions={[
          { href: "/archive", label: "Browse the archive", primary: true },
          { href: "/", label: "Today's edition" },
        ]}
      />
    );
  }

  return (
    <LostState
      art="blank"
      kicker="Off the page"
      title="This page isn't in any edition."
      body="The link may be old or mistyped. Nothing's wrong on your end."
      actions={[
        { href: "/", label: "Read today's edition", primary: true },
        { href: "/archive", label: "Browse the archive" },
      ]}
    />
  );
}

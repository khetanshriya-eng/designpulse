import Link from "next/link";

/**
 * Branded 404 — replaces Next's unstyled default. Served with a real 404
 * status, so search engines don't index dead URLs as content.
 */
export default function NotFound() {
  return (
    <div className="max-w-[560px] mx-auto px-4 py-24 text-center">
      <p
        className="font-pixel text-[3.5rem] leading-none mb-4"
        style={{ color: "var(--color-accent)" }}
        aria-hidden
      >
        404
      </p>
      <h1 className="font-heading text-[2.2rem] leading-tight text-ink">
        Nothing at this address.
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
        The page you&apos;re after doesn&apos;t exist — it may have moved, or
        the link was mistyped.
      </p>
      <div className="mt-8">
        <Link
          href="/"
          className="surface-card inline-block font-pixel text-[13px] uppercase tracking-[0.08em] px-4 py-2 text-ink"
        >
          ← Back to today&apos;s edition
        </Link>
      </div>
    </div>
  );
}

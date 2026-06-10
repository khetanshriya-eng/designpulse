"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route error boundary. Catches render/data errors below the root layout and
 * shows a branded recovery screen instead of Next's unstyled default. The
 * layout (nav + footer) stays mounted around this.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in the browser console / Vercel logs for diagnosis.
    console.error("route error:", error);
  }, [error]);

  return (
    <div className="max-w-[560px] mx-auto px-4 py-24 text-center">
      <p className="font-pixel text-[12px] uppercase tracking-[0.14em] text-accent mb-2">
        Error
      </p>
      <h1 className="font-heading text-[2.2rem] leading-tight text-ink">
        Something glitched.
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
        The page hit an unexpected error. It&apos;s been logged — try again,
        or head back to today&apos;s edition.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="surface-card font-pixel text-[13px] uppercase tracking-[0.08em] px-4 py-2 text-ink"
        >
          Try again
        </button>
        <Link
          href="/"
          className="font-pixel text-[13px] uppercase tracking-[0.08em] text-accent hover:underline"
        >
          Today&apos;s edition →
        </Link>
      </div>
    </div>
  );
}

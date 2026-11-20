"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PixelPaper } from "@/components/LostState";

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
    <div className="max-w-[600px] mx-auto px-4 py-16 sm:py-24 text-center">
      <PixelPaper art="jam" />
      <p className="mt-8 font-pixel text-[12px] uppercase tracking-[0.16em] text-accent">
        Our fault
      </p>
      <h1 className="mt-2 font-heading text-[2rem] sm:text-[2.4rem] leading-tight text-ink">
        The press jammed.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
        Something went wrong on our side while loading this page. It&apos;s been
        logged, and trying again usually works.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
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

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About · Designator",
  description:
    "Designator started as a personal project to stop scouring half a dozen sites every morning to keep up with what's happening in design.",
};

export default function AboutPage() {
  return (
    <article className="max-w-[680px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
      <p className="font-heading text-[11px] uppercase tracking-[0.14em] font-bold text-accent mb-3">
        About
      </p>
      <h1 className="font-heading text-[2.25rem] sm:text-[2.75rem] leading-[1.05] font-extrabold tracking-tight text-ink">
        Built out of frustration.
      </h1>

      <div className="mt-8 space-y-5 text-[16px] leading-relaxed text-ink-muted">
        <p>
          Designator started as a personal project. I was tired of scouring
          half a dozen webpages every morning. Figma&apos;s blog, NN/g, UX
          Collective, Smashing, half a dozen YouTube channels. All of it just
          to keep up with what was happening in design.
        </p>
        <p>
          So I built an aggregator. It pulls everything I care about into
          one tab, summarizes the long stuff, and surfaces the day&apos;s
          hero piece. No re-publishing, no scraping at scale, just smarter
          surfacing with attribution back to the source.
        </p>
        <p>
          A few friends loved it, so I thought I&apos;d share it with
          everyone. That&apos;s it. No company, no roadmap meeting, no
          ads.
        </p>
      </div>

      <div className="mt-12 pt-8 border-t border-rule">
        <h2 className="font-heading text-[1.1rem] font-bold tracking-tight text-ink mb-3">
          How it works
        </h2>
        <ul className="space-y-2 text-[14.5px] text-ink-muted">
          <li>
            <span className="text-ink font-medium">72 sources</span>:
            blogs, RSS feeds, YouTube channels, podcasts, newsletters.
          </li>
          <li>
            The pipeline runs <span className="text-ink font-medium">twice a day</span>,
            morning and evening, fetching new items, summarizing them
            with an LLM, and picking the day&apos;s hero plus a handful
            of must-reads.
          </li>
          <li>
            Built on Next.js, Supabase, and Vercel Cron. Open code,
            opinionated taste.
          </li>
        </ul>
      </div>

      <Link
        href="/"
        className="inline-block mt-12 text-[13px] font-medium text-accent hover:underline"
      >
        ← Back to today&apos;s edition
      </Link>
    </article>
  );
}

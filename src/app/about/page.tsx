import type { Metadata } from "next";
import Link from "next/link";
import { SOURCES } from "@/data/sources";

export const metadata: Metadata = {
  title: "About · Designator",
  description:
    "Why Designator exists, how it works, and who built it — a daily design briefing made by one designer tired of missing things.",
};

const SOURCE_COUNT = SOURCES.length;

const SOCIALS: { label: string; href: string }[] = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/aditya-singh-249a381b4/" },
  { label: "Instagram", href: "https://www.instagram.com/thisweek.thatfeeling/" },
];

const STEPS = [
  {
    n: 1,
    title: "Collect",
    body: `${SOURCE_COUNT} sources checked twice daily — RSS, YouTube, and light web scraping — with attribution back to the original.`,
  },
  {
    n: 2,
    title: "Summarize",
    body: "AI reads each piece and distills it to 2–3 lines you can scan in seconds, so the morning takes five minutes, not thirty.",
  },
  {
    n: 3,
    title: "Curate",
    body: "Weighted by design relevance, not just recency. Tech news is there, but it never drowns out the design thinking.",
  },
];

export default function AboutPage() {
  return (
    <div className="site-container pt-14 pb-24">
    {/* Prose constrained to a reading measure, left-aligned so the left edge
        matches the homepage container (consistent margins across pages). */}
    <article className="max-w-[760px]">
      {/* Intro */}
      <p className="font-pixel text-[12px] uppercase tracking-[0.16em] text-accent mb-3">
        About
      </p>
      <h1 className="font-heading text-[2.4rem] sm:text-[3rem] leading-[1.02] text-ink">
        A briefing that keeps itself current, so you don&apos;t have to.
      </h1>

      {/* Why this exists */}
      <Section title="Why this exists">
        <div className="space-y-5 text-[16px] leading-relaxed text-ink-muted">
          <p>
            I&apos;m a product designer, and I kept missing things. A Figma
            feature would drop, NN/g would publish a landmark study, some new AI
            design tool would launch — and I&apos;d only hear about it days later
            from a colleague. The information was all out there; it was just
            scattered across seventy-odd places: blogs, YouTube, newsletters,
            podcasts, RSS feeds. No matter how many tabs I kept open or how many
            lists I subscribed to, things slipped through.
          </p>
          <p>
            So I built Designator. It pulls from all those sources
            automatically, summarizes each piece with AI so I can scan it in
            seconds, and lays everything out in one daily edition. My morning
            briefing went from thirty minutes of tab-hopping to about five.
          </p>
          <p>
            It&apos;s opinionated on purpose — this isn&apos;t a firehose. The
            feed is weighted toward design and product, not just whatever
            published most recently. Tech news has a seat at the table; it just
            doesn&apos;t get to run the room.
          </p>
        </div>
      </Section>

      {/* How it works */}
      <Section title="How it works">
        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="surface-card p-5 flex flex-col gap-3">
              <span
                className="font-pixel text-[13px] w-8 h-8 grid place-items-center text-[color:var(--color-paper)]"
                style={{ background: "var(--color-accent)" }}
                aria-hidden
              >
                {s.n}
              </span>
              <h3 className="font-heading text-[1.4rem] leading-none text-ink">
                {s.title}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-ink-muted">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Built by — the personal touch, accent-tinted to stand out */}
      <Section title="Built by">
        <div
          className="surface-card p-6 sm:p-7"
          style={{
            background:
              "color-mix(in srgb, var(--color-accent) 9%, var(--color-card))",
          }}
        >
          <h3 className="font-heading text-[1.7rem] leading-none text-ink">
            Aditya
          </h3>
          <p className="font-pixel text-[12px] uppercase tracking-[0.12em] text-accent mt-1.5">
            Confused Designer
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted max-w-[48ch]">
            Designator is a side project, born from the daily frustration of
            keeping up. If you have a source to suggest or feedback to share,
            reach out — I read everything.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-pixel text-[12px] uppercase tracking-[0.06em] px-3 py-2 border-2 border-[color:var(--card-border)] text-ink hover:bg-accent hover:text-[color:var(--color-paper)] transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </Section>

      {/* The sources */}
      <Section title="The sources">
        <p className="text-[16px] leading-relaxed text-ink-muted">
          Designator pulls from {SOURCE_COUNT} trusted sources across design,
          product, tech, and AI — from Figma&apos;s blog to Lenny&apos;s
          Newsletter to 99% Invisible.
        </p>
        <Link
          href="/sources"
          className="inline-block mt-4 font-pixel text-[13px] uppercase tracking-[0.06em] text-accent hover:underline"
        >
          → See all sources
        </Link>
      </Section>

      {/* Colophon */}
      <Section title="Colophon">
        <div className="space-y-1.5 text-[14px] leading-relaxed text-ink-muted font-sans">
          <p>Built with Next.js, Supabase, and Vercel.</p>
          <p>Summaries generated by Gemini 2.5 Flash.</p>
          <p>Edition refreshed at 6am and 6pm IST.</p>
        </div>
        <a
          href="/api/rss"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 font-pixel text-[13px] uppercase tracking-[0.06em] text-accent hover:underline"
        >
          → Subscribe via RSS
        </a>
        {/* TODO: add GitHub link here if/when the repo is made public. */}
      </Section>

      <Link
        href="/"
        className="inline-block mt-16 text-[13px] font-medium text-accent hover:underline"
      >
        ← Back to today&apos;s edition
      </Link>
    </article>
    </div>
  );
}

/**
 * A scroll section with generous top padding and a pixel-divider'd, uppercase
 * Pixelify heading — the repeating shape that gives the page its rhythm.
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-16">
      <div
        className="h-1 w-12 mb-4"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--color-accent) 0 6px, transparent 6px 12px)",
        }}
        aria-hidden
      />
      <h2 className="font-pixel text-[13px] uppercase tracking-[0.16em] text-ink mb-6">
        {title}
      </h2>
      {children}
    </section>
  );
}

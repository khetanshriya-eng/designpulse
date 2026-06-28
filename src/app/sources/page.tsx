import type { Metadata } from "next";
import Link from "next/link";
import {
  CATEGORY_META,
  SOURCES,
  type SourceCategory,
} from "@/data/sources";
import { SectionHeader } from "@/components/SectionHeader";
import { SourceLogo } from "@/components/SourceLogo";

export const metadata: Metadata = {
  title: "All sources · Designator",
  description:
    "Every blog, newsletter, YouTube channel and podcast feeding Designator, organized by category.",
};

const CATEGORY_ORDER: SourceCategory[] = [
  "design-tools",
  "ux-thinking",
  "inspiration",
  "youtube",
  "product",
  "tech-news",
  "ai-tools",
  "newsletters",
  "podcasts",
];

const CATEGORY_DESCRIPTIONS: Record<SourceCategory, string> = {
  "design-tools":
    "Updates from Figma and the broader design toolchain. Plugins, IDE-style tools, and the workflows around them.",
  "ux-thinking":
    "Long-form essays and research on craft, usability, and how design holds up under real users.",
  inspiration:
    "Visual showcases. Sites, flows, components and screenshots, surfaced and not summarized.",
  youtube:
    "Channels with consistently useful videos on design, tooling, and product craft.",
  product:
    "How products are built, priced, and run, for designers who think in business terms.",
  "tech-news":
    "Industry-level news that affects what you'll be designing six months from now.",
  "ai-tools":
    "AI products and research that are reshaping the designer's stack.",
  newsletters:
    "General-interest curators worth one inbox slot per day.",
  podcasts:
    "Conversations worth a commute. Craft, careers, and the business of design.",
};

export default function SourcesPage() {
  return (
    <div className="site-container pt-10 sm:pt-12 pb-12">
      {/* Page header */}
      <header className="mb-12">
        <p className="font-heading text-[11px] uppercase tracking-[0.14em] font-bold text-accent mb-2">
          The library
        </p>
        <h1 className="font-heading text-[2.25rem] sm:text-[2.75rem] leading-[1.05] font-extrabold tracking-tight text-ink">
          All {SOURCES.length} sources that feed Designator
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted max-w-2xl">
          We pull from blogs, RSS feeds, YouTube channels, podcasts and curated
          newsletters. Each piece is summarized and attributed back to its
          source. No re-publishing, no scraping at scale, just smarter
          surfacing.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((slug) => {
            const meta = CATEGORY_META[slug];
            const count = SOURCES.filter((s) => s.category === slug).length;
            return (
              <a
                key={slug}
                href={`#${slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule rounded-full text-[12px] text-ink-muted hover:text-ink hover:border-ink-muted transition-colors"
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: meta.dotVar }}
                />
                {meta.label}
                <span className="text-ink-subtle">·{count}</span>
              </a>
            );
          })}
        </div>
      </header>

      {/* Per-category sections */}
      <div className="flex flex-col gap-14">
        {CATEGORY_ORDER.map((slug) => {
          const meta = CATEGORY_META[slug];
          const sources = SOURCES.filter((s) => s.category === slug);
          return (
            <section key={slug} id={slug} aria-labelledby={`heading-${slug}`}>
              <SectionHeader
                kicker={meta.label}
                title={`${sources.length} ${
                  sources.length === 1 ? "source" : "sources"
                } in ${meta.label.toLowerCase()}`}
                description={CATEGORY_DESCRIPTIONS[slug]}
              />
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                {sources.map((s) => (
                  <li key={s.id} id={s.slug}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 p-3 border border-rule rounded-sm hover:border-ink hover:bg-paper-warm transition-colors"
                    >
                      <SourceLogo source={s} />
                      <span className="flex-1 min-w-0">
                        <span className="block font-heading font-semibold text-[14px] text-ink truncate group-hover:text-accent transition-colors">
                          {s.name}
                        </span>
                        <span className="block text-[11px] text-ink-subtle uppercase tracking-wider mt-0.5">
                          {s.type}
                          {s.feedUrl && (
                            <span className="ml-2 inline-block text-ink-muted normal-case tracking-normal lowercase">
                              · RSS
                            </span>
                          )}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="text-ink-subtle group-hover:text-ink transition-colors"
                      >
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Submit a source */}
      <section className="mt-20 rule-strong-top pt-8">
        <h2 className="font-heading text-[1.4rem] font-extrabold tracking-tight text-ink">
          Missing a source?
        </h2>
        <p className="mt-2 text-[14px] text-ink-muted max-w-prose">
          Designator is opinionated, not exhaustive, but if you think
          something belongs here, send it our way. We add 1-2 sources per
          quarter after vetting.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 text-[13px] font-medium text-accent hover:underline"
        >
          ← Back to today&apos;s edition
        </Link>
      </section>
    </div>
  );
}

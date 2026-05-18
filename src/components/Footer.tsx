import Link from "next/link";
import { CATEGORY_META, type SourceCategory } from "@/data/sources";

const FOOTER_CATEGORIES: SourceCategory[] = [
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

export function Footer() {
  return (
    <footer className="border-t border-rule bg-paper-warm">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent" aria-hidden />
              <span className="font-heading font-extrabold tracking-tight">DesignPulse</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-muted max-w-xs">
              The daily briefing for product designers. 70+ sources, summarized,
              in one tab.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-[11px] uppercase tracking-[0.14em] text-ink-subtle">
              Categories
            </h4>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {FOOTER_CATEGORIES.slice(0, 5).map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/category/${slug}`}
                    className="text-ink-muted hover:text-ink transition-colors"
                  >
                    {CATEGORY_META[slug].label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-[11px] uppercase tracking-[0.14em] text-ink-subtle">
              More
            </h4>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {FOOTER_CATEGORIES.slice(5).map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/category/${slug}`}
                    className="text-ink-muted hover:text-ink transition-colors"
                  >
                    {CATEGORY_META[slug].label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-[11px] uppercase tracking-[0.14em] text-ink-subtle">
              About
            </h4>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              <li>
                <Link href="/sources" className="text-ink-muted hover:text-ink transition-colors">
                  All sources
                </Link>
              </li>
              <li>
                <Link href="/archive" className="text-ink-muted hover:text-ink transition-colors">
                  Past editions
                </Link>
              </li>
              <li>
                <a
                  href="#about"
                  className="text-ink-muted hover:text-ink transition-colors"
                >
                  About DesignPulse
                </a>
              </li>
              <li>
                <a
                  href="#rss"
                  className="text-ink-muted hover:text-ink transition-colors"
                >
                  RSS
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-rule flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-ink-subtle">
          <p>© {new Date().getFullYear()} DesignPulse. Sources retain ownership of their content.</p>
          <p>Edition refreshed twice daily.</p>
        </div>
      </div>
    </footer>
  );
}

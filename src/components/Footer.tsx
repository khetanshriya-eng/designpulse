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
    // Always-dark arcade footer — a stable anchor regardless of page theme.
    <footer className="text-[#f5f0e8]" style={{ background: "#1a1340" }}>
      {/* Thick multi-color pixel divider caps the page. */}
      <div
        className="h-1.5"
        style={{
          background:
            "repeating-linear-gradient(90deg, #d4ff3f 0 12px, #ff4fd8 12px 24px, #00e5ff 24px 36px, #ffb800 36px 48px)",
        }}
        aria-hidden
      />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <span
              className="font-pixel pixel-crisp font-bold text-[1.4rem] leading-none lowercase tracking-tight"
              style={{ color: "var(--color-lime)", textShadow: "2px 2px 0 #000" }}
            >
              designator
            </span>
            <p className="mt-3 text-[13px] leading-relaxed text-white/60 max-w-xs">
              The daily briefing for product designers. 70+ sources,
              summarized, in one tab.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-[11px] uppercase tracking-[0.14em] text-white/50">
              Categories
            </h4>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {FOOTER_CATEGORIES.slice(0, 5).map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/category/${slug}`}
                    className="text-white/70 hover:text-[color:var(--color-lime)] transition-colors"
                  >
                    {CATEGORY_META[slug].label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-[11px] uppercase tracking-[0.14em] text-white/50">
              More
            </h4>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {FOOTER_CATEGORIES.slice(5).map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/category/${slug}`}
                    className="text-white/70 hover:text-[color:var(--color-lime)] transition-colors"
                  >
                    {CATEGORY_META[slug].label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-[11px] uppercase tracking-[0.14em] text-white/50">
              About
            </h4>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              <li>
                <Link href="/sources" className="text-white/70 hover:text-[color:var(--color-lime)] transition-colors">
                  All sources
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-white/70 hover:text-[color:var(--color-lime)] transition-colors">
                  About Designator
                </Link>
              </li>
              <li>
                <Link href="/#subscribe" className="text-white/70 hover:text-[color:var(--color-lime)] transition-colors">
                  Subscribe
                </Link>
              </li>
              <li>
                <a
                  href="/api/rss"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-[color:var(--color-lime)] transition-colors"
                >
                  RSS feed
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-white/50">
          <p>© {new Date().getFullYear()} Designator. Sources retain ownership of their content.</p>
          <p>
            Edition refreshed twice daily.{" "}
            <span style={{ color: "var(--color-lime)" }} aria-hidden>✦</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

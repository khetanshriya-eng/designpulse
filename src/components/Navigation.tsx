import Link from "next/link";
import { CATEGORY_META, type SourceCategory } from "@/data/sources";
import { formatEditionDate } from "@/lib/format";
import { listEditionDates } from "@/lib/data/queries";
import { SearchTrigger } from "./SearchTrigger";

const NAV_CATEGORIES: SourceCategory[] = [
  "design-tools",
  "ux-thinking",
  "inspiration",
  "product",
  "tech-news",
  "ai-tools",
  "podcasts",
];

export async function Navigation() {
  // Newest edition date from the DB. Falls back to today's ISO date so the
  // header still renders something sensible before the first edition exists.
  let editionDate: string;
  try {
    const dates = await listEditionDates(1);
    editionDate = dates[0] ?? new Date().toISOString().slice(0, 10);
  } catch {
    editionDate = new Date().toISOString().slice(0, 10);
  }

  return (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80 border-b border-rule">
      {/* Top strip: edition date + logo + utility */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent" aria-hidden />
              <span className="font-heading font-extrabold text-[1.05rem] tracking-tight">
                DesignPulse
              </span>
            </Link>
            <Link
              href={`/edition/${editionDate}`}
              className="hidden sm:inline-block text-[11px] uppercase tracking-[0.14em] text-ink-subtle border-l border-rule pl-3 ml-1 hover:text-ink transition-colors"
            >
              {formatEditionDate(editionDate)}
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/sources"
              className="hidden sm:inline-block text-[13px] text-ink-muted hover:text-ink transition-colors"
            >
              Sources
            </Link>
            <SearchTrigger />
          </div>
        </div>
      </div>

      {/* Category nav row */}
      <nav
        aria-label="Categories"
        className="border-t border-rule overflow-x-auto"
      >
        <ul className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-5 sm:gap-7 h-10 text-[13px] whitespace-nowrap">
          <li>
            <Link href="/" className="font-medium text-ink hover:text-accent transition-colors">
              Today
            </Link>
          </li>
          {NAV_CATEGORIES.map((slug) => (
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
      </nav>
    </header>
  );
}

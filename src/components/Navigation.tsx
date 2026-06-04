import Link from "next/link";
import type { SourceCategory } from "@/data/sources";
import { formatEditionDate } from "@/lib/format";
import { listEditionDates, getArticleCount } from "@/lib/data/queries";
import { SearchTrigger } from "./SearchTrigger";
import { CategoryNav } from "./CategoryNav";

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
  let storyCount = 0;
  try {
    const [dates, count] = await Promise.all([
      listEditionDates(1),
      getArticleCount(),
    ]);
    editionDate = dates[0] ?? new Date().toISOString().slice(0, 10);
    storyCount = count;
  } catch {
    editionDate = new Date().toISOString().slice(0, 10);
  }

  return (
    <header className="sticky top-0 z-30">
      {/* Top strip: pixel logo + edition readout + utility. Purple bar in
          morning, dark navy at night (--nav-bg). */}
      <div
        className="border-b-[3px] border-[color:var(--card-border)]"
        style={{ background: "var(--nav-bg)", color: "var(--nav-ink)" }}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/" aria-label="Designator — home" className="group flex items-center">
                {/* Pixel wordmark. Swap for an <img src="/designator-logo.png">
                    if you drop your exact asset into /public. */}
                <span
                  className="font-pixel pixel-crisp font-bold text-[1.4rem] leading-none lowercase tracking-tight"
                  style={{
                    color: "var(--color-lime)",
                    textShadow: "2px 2px 0 #1a1340",
                  }}
                >
                  designator
                </span>
              </Link>
              <Link
                href={`/edition/${editionDate}`}
                className="hidden sm:inline-block text-[11px] uppercase tracking-[0.14em] opacity-70 border-l border-white/25 pl-3 ml-1 hover:opacity-100 transition-opacity"
              >
                {formatEditionDate(editionDate)}
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/sources"
                className="hidden sm:inline-block font-pixel text-[14px] opacity-80 hover:opacity-100 transition-opacity"
              >
                Sources
              </Link>
              <SearchTrigger />
            </div>
          </div>
        </div>
      </div>

      {/* Category nav row — links on the left, story-count meter on the right.
          Client component so it can highlight the active path. */}
      <CategoryNav categories={NAV_CATEGORIES} storyCount={storyCount} />
    </header>
  );
}

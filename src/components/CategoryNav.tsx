"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORY_META, type SourceCategory } from "@/data/sources";

type Props = {
  categories: SourceCategory[];
  storyCount: number;
};

/**
 * Category nav row. Client component because it reads `usePathname()` to
 * highlight the active tab — server components can't access the request
 * path without a workaround.
 *
 * Active styling: `aria-current="page"` for assistive tech plus a stronger
 * `text-ink` color + a 2px underline using the brand accent. Matches the
 * Today link when the user is at `/`.
 */
export function CategoryNav({ categories, storyCount }: Props) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Categories"
      // overflow-x-auto enables horizontal scroll for the tab strip on mobile.
      // overflow-y-hidden is explicit: without it browsers compute overflow-y
      // to auto (because overflow-x is auto), which makes the nav its own
      // vertical scroll container — combined with the active tab's
      // border-b-2 spilling 1px below the parent's h-10, mobile users see a
      // vertical scrollbar inside the nav and the page jitters diagonally
      // while swiping. Bug report 2026-05-29.
      // touch-action: pan-x tells mobile browsers any swipe on the nav is
      // horizontal-only; vertical swipes pass through to the page scroll.
      className="bg-paper border-b border-rule overflow-x-auto overflow-y-hidden [touch-action:pan-x]"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-10 gap-6">
        <ul className="flex items-center gap-5 sm:gap-7 text-[13px] whitespace-nowrap">
          <li>
            <NavLink href="/" active={isActive("/")} label="Today" emphasis />
          </li>
          {categories.map((slug) => {
            const href = `/category/${slug}`;
            return (
              <li key={slug}>
                <NavLink
                  href={href}
                  active={isActive(href)}
                  label={CATEGORY_META[slug].label}
                />
              </li>
            );
          })}
        </ul>
        {storyCount > 0 && (
          <span className="hidden md:inline-block text-[10px] uppercase tracking-[0.16em] text-ink-subtle whitespace-nowrap font-mono">
            {storyCount} stories curated
          </span>
        )}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  label,
  emphasis = false,
}: {
  href: string;
  active: boolean;
  label: string;
  emphasis?: boolean;
}) {
  // The inactive baseline depends on whether this is the "Today" tab
  // (heavier ink) or a category tab (muted). Active state always promotes
  // to full ink + underline.
  const baseColor = emphasis ? "text-ink" : "text-ink-muted";
  const activeClasses = active
    ? "text-ink font-semibold border-b-2 border-accent -mb-px"
    : `${baseColor} border-b-2 border-transparent hover:text-ink`;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`font-pixel inline-flex items-center h-10 transition-colors ${activeClasses}`}
    >
      {label}
      {active && (
        <span
          className="nav-cursor ml-1 -mr-1"
          style={{ color: "var(--color-accent)" }}
          aria-hidden
        >
          ▮
        </span>
      )}
    </Link>
  );
}

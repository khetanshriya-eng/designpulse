import Link from "next/link";
import type { ReactNode } from "react";
import { CATEGORY_META, type SourceCategory } from "@/data/sources";

/**
 * The pixel card surface used across the homepage grids. Renders an external
 * link styled as a tactile pixel button (3px border + hard offset shadow +
 * hover lift, all from the `.surface-card` class in globals.css) with a 4px
 * category accent stripe flush under the top border.
 *
 * `.surface-card` re-scopes the ink tokens to dark-on-cream, so any text
 * inside reads correctly in both morning and night themes (cards stay cream).
 */
export function PixelCard({
  href,
  category,
  className = "",
  children,
}: {
  href: string;
  category: SourceCategory;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group surface-card flex flex-col ${className}`}
    >
      <span
        className="card-stripe"
        style={{ background: CATEGORY_META[category].stripeVar }}
        aria-hidden
      />
      {children}
    </Link>
  );
}

"use client";

import { useState } from "react";

type Props = {
  /** The URL to copy. */
  url: string;
  /** Visible label in the non-compact variant ("Copy link", "Share edition"). */
  label?: string;
  /** Icon-only (for dense card overlays) vs icon + text. */
  compact?: boolean;
  /**
   * Chip styling for the card overlay: fixed cream/lime colors (the chip lives
   * outside the card's ink re-scope, so theme-following colors would be
   * low-contrast on the always-navy chip).
   */
  chip?: boolean;
  className?: string;
};

/**
 * Copy-to-clipboard share control. No social buttons — the icon swap to ✓ IS
 * the feedback. Uses the async Clipboard API with an execCommand fallback for
 * older/insecure contexts. preventDefault/stopPropagation so it never triggers
 * a surrounding card link (it's also rendered as a sibling overlay, not nested
 * inside the anchor, so the markup stays valid).
 *
 * The "copied" state uses the accent (not lime) — lime fails contrast on the
 * cream card surface.
 */
export function CopyLink({ url, label = "Copy link", compact = false, chip = false, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  // Inline (default): follow the surrounding ink. Chip: fixed colors for the
  // navy overlay chip, which sits outside the card's dark-on-cream re-scope.
  const colorClass = chip
    ? copied
      ? "text-[color:var(--color-lime)]"
      : "text-[#fffaf0] hover:text-[color:var(--color-lime)]"
    : copied
      ? "text-accent"
      : "text-ink-subtle hover:text-ink";

  async function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for older browsers / non-secure contexts.
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* give up silently */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Link copied" : label}
      title={copied ? "Copied!" : label}
      className={`inline-flex items-center gap-1.5 font-pixel text-[11px] uppercase tracking-[0.06em] transition-colors ${colorClass} ${className}`}
    >
      {copied ? (
        <span aria-hidden className="text-[13px] leading-none">
          ✓
        </span>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          shapeRendering="crispEdges"
          aria-hidden
          className="shrink-0"
        >
          <rect x="5" y="5" width="9" height="9" stroke="currentColor" strokeWidth="2" />
          <path d="M3 11V3H11" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
      {!compact && <span>{copied ? "Copied!" : label}</span>}
    </button>
  );
}

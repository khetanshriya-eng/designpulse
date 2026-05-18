"use client";

import { useState } from "react";
import type { Source } from "@/data/sources";
import { faviconUrl } from "@/lib/source-domain";

type Props = {
  source: Source;
  /** Tailwind size classes (w-? h-?) — text-? for fallback initials sizing */
  className?: string;
  /** Initials font size used by the fallback chip */
  fallbackTextClass?: string;
};

/**
 * Bare circular source logo: favicon by default, swatch+initials on error.
 * Use for grid avatars in /sources, etc. SourceBadge wraps this with a name.
 */
export function SourceLogo({
  source,
  className = "w-10 h-10",
  fallbackTextClass = "text-[12px]",
}: Props) {
  const [failed, setFailed] = useState(false);
  const src = faviconUrl(source);
  const isYouTube = source.type === "youtube" || source.url?.includes("youtube.com");

  if (isYouTube) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="https://www.google.com/s2/favicons?domain=youtube.com&sz=128"
        alt=""
        aria-hidden
        loading="lazy"
        className={`shrink-0 rounded-md object-contain ${className}`}
      />
    );
  }

  if (failed || !src) {
    return (
      <span
        className={`shrink-0 inline-flex items-center justify-center rounded-full font-heading font-bold text-paper ${fallbackTextClass} ${source.swatch} ${className}`}
        aria-hidden
      >
        {source.initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover bg-paper-tint ${className}`}
    />
  );
}

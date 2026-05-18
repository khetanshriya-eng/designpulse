"use client";

import { useState } from "react";
import { sourceById } from "@/data/sources";
import { faviconUrl } from "@/lib/source-domain";

type Props = {
  sourceId: string;
  size?: "sm" | "md";
  showType?: boolean;
};

export function SourceBadge({ sourceId, size = "sm", showType = false }: Props) {
  const s = sourceById(sourceId);
  const [failed, setFailed] = useState(false);
  const dim = size === "sm" ? "w-5 h-5 text-[9px]" : "w-7 h-7 text-[10px]";
  const src = faviconUrl(s);

  // YouTube sources show YouTube's own favicon with object-contain in a
  // rounded square (not a circle) so the wordmark isn't cropped or distorted.
  const isYouTube = s.type === "youtube" || s.url?.includes("youtube.com");

  return (
    <div className="flex items-center gap-2 min-w-0">
      {isYouTube ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="https://www.google.com/s2/favicons?domain=youtube.com&sz=128"
          alt=""
          aria-hidden
          loading="lazy"
          className={`shrink-0 rounded-md object-contain ${dim}`}
        />
      ) : failed || !src ? (
        <span
          className={`shrink-0 inline-flex items-center justify-center rounded-full font-heading font-bold text-paper ${dim} ${s.swatch}`}
          aria-hidden
        >
          {s.initials}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden
          loading="lazy"
          onError={() => setFailed(true)}
          className={`shrink-0 rounded-full object-cover bg-paper-tint ${dim}`}
        />
      )}
      <span
        className={`truncate font-medium ${
          size === "sm" ? "text-[12px]" : "text-[13px]"
        } text-ink`}
      >
        {s.name}
      </span>
      {showType && (
        <span className="text-[11px] uppercase tracking-wide text-ink-subtle">
          {s.type}
        </span>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { getEditionName } from "@/lib/editionName";
import { formatEditionDate } from "@/lib/format";
import { EditionPicker } from "./EditionPicker";
import { ShareEditionButton } from "./ShareEditionButton";

/**
 * Identity bar for an edition, shown directly below the category tabs on the
 * home + edition pages: the quirky edition name + date (click to open the
 * date picker) on the left, a prominent share button on the right. Replaces
 * the old prev/next arrows and the barely-noticeable share affordance.
 */
export function EditionBar({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const name = getEditionName(date);

  return (
    <div className="site-container">
      <div className="relative flex items-center justify-between gap-3 pt-4 pb-2">
        {/* Name stacked over date — the two-line left block gives the title
            side enough visual weight to balance the share button on the right
            (instead of "name · date" running into an oversized button). */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="Browse past editions"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="group flex flex-col items-start gap-0.5 min-w-0 text-left"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-heading text-[1.3rem] sm:text-[1.6rem] leading-none text-ink truncate">
              {name}
            </span>
            <span
              aria-hidden
              className="font-pixel text-[13px] text-accent transition-transform group-hover:translate-y-0.5"
            >
              ▾
            </span>
          </span>
          <span className="font-mono text-[12px] text-ink-subtle whitespace-nowrap">
            {formatEditionDate(date)}
          </span>
        </button>

        <ShareEditionButton editionUrl={`https://designatorapp.com/edition/${date}`} />

        <EditionPicker open={open} onClose={() => setOpen(false)} currentDate={date} />
      </div>
    </div>
  );
}

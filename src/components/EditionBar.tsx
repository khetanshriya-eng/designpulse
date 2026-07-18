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
            {/* Real chevron in a lime pixel chip so it reads as a control, not
                decoration. Flips while the picker is open. */}
            <span
              aria-hidden
              className={`shrink-0 inline-flex items-center justify-center w-5 h-5 bg-lime border-2 border-[#1a1340] transition-transform group-hover:translate-y-0.5 ${
                open ? "rotate-180" : ""
              }`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" shapeRendering="crispEdges">
                <path d="M1 3l4 4 4-4" stroke="#1a1340" strokeWidth="2" />
              </svg>
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

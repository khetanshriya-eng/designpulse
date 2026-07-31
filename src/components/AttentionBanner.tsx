import { DismissNoticeButton } from "./DismissNoticeButton";
import { ReSubscribeCTA } from "./ReSubscribeCTA";

/**
 * Temporary site-wide service notice: apologises for subscribers dropped during
 * the mailing-system migration and invites a re-subscribe. Amber (the palette's
 * caution hue) so it reads as an alert and pops against the purple/navy chrome
 * in both themes.
 *
 * Sits directly under the sticky header, so it scrolls away behind the nav (no
 * iOS-notch handling needed) and shows on every page. The ✕ remembers dismissal
 * in localStorage; a pre-paint script in layout.tsx hides the bar for readers
 * who've already closed it (no flash, no layout shift).
 *
 * To RETIRE it: delete <AttentionBanner/> from layout.tsx (plus the pre-paint
 * script line) and remove this file + DismissNoticeButton.tsx. To resurface a
 * NEW notice later, bump the version in both NOTICE_KEY spots ("...-v1" → "-v2").
 */
export function AttentionBanner() {
  return (
    <section className="attention-banner" aria-label="Service notice">
      <div className="site-container">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 py-2.5">
          <div className="flex-1 min-w-0 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            <span className="attention-badge font-pixel hidden sm:inline-flex">
              Oops
            </span>
            <p className="w-full sm:flex-1 min-w-0 text-[13px] sm:text-[14px] leading-snug">
              A technical hiccup dropped some readers from our mailing list. If
              Designator went quiet, we&rsquo;re sorry. Re-subscribe and
              you&rsquo;ll be back in tomorrow&rsquo;s edition.
            </p>
            <ReSubscribeCTA className="attention-cta font-pixel self-start sm:self-auto shrink-0" />
          </div>
          <DismissNoticeButton />
        </div>
      </div>
    </section>
  );
}

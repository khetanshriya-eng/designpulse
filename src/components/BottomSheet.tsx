"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalA11y } from "@/lib/use-modal-a11y";

const MOBILE_MQ = "(max-width: 767px)";

/**
 * Shared modal shell: a bottom sheet on mobile (slide-up, darkened scrim,
 * floating pixel ✕ above the sheet edge, body scroll lock, keyboard-aware
 * sizing), or a desktop panel positioned via `desktopClassName` (e.g. an
 * anchored dropdown). Used by the edition picker and the mobile search.
 *
 * Mechanics centralized here so every consumer gets the same guarantees:
 * - No drag-to-dismiss: the gesture fought background scroll, so dismissal is
 *   the ✕ button / backdrop tap / Escape / selecting a result — all of which
 *   funnel through onClose, so the effect-return cleanups below run on every
 *   close path (including route navigation).
 * - PullToRefresh stands down while open (data-modalOpen flag) — a scroll at
 *   the top edge of the results list could still bubble to #app-scroll.
 * - The body is scroll-locked on mobile while open, so iOS can't shift the
 *   page to "reveal" a focused input; the exact scroll position is restored
 *   on close.
 * - No autofocus on mobile (focusing an input would summon the keyboard the
 *   moment the sheet opens). Desktop gets the standard modal focus handling.
 * - Keyboard-aware: the whole overlay is anchored to the visualViewport
 *   (height + offsetTop), so when the keyboard opens the sheet rides up and
 *   shrinks to the VISIBLE area — pinned input stays put, results scroll,
 *   nothing clips behind the keyboard.
 */
export function BottomSheet({
  open,
  onClose,
  ariaLabel,
  desktopClassName = "",
  closeOnDesktopScroll = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  /** md+ positioning/size overrides (anchored dropdown, centered panel, …). */
  desktopClassName?: string;
  /** Close when the page scrolls under an anchored desktop dropdown. */
  closeOnDesktopScroll?: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Mobile = sheet, desktop = positioned panel. Tracked live so a rotation
  // swaps presentation on the next open.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Visual viewport tracking — listeners live for the component's whole life
  // (not gated on `open`) so a keyboard that closes AFTER the sheet closed
  // still resets the stored height; otherwise the next open would start from
  // a stale, keyboard-sized value. Events are rare (keyboard, pinch), and
  // setState with an unchanged value is a cheap React bail-out.
  const [vvH, setVvH] = useState<number | null>(null);
  const [vvTop, setVvTop] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setVvH(Math.round(vv.height));
      setVvTop(Math.round(vv.offsetTop));
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // Desktop-only focus trap + autofocus (on mobile, focusing the first control
  // would open the iOS keyboard immediately).
  useModalA11y(open && !isMobile, panelRef, onClose);

  // Escape for the mobile sheet (hardware keyboards); on desktop the a11y
  // hook already handles Escape in the capture phase.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Mobile scroll lock + PTR stand-down. CRITICAL: on touch devices the page
  // scrolls inside #app-scroll, NOT the document — locking document.body (the
  // earlier approach) was a no-op and the background kept scrolling behind
  // the sheet. Lock the real scroller: overflow hidden stops touch scrolling
  // dead, and the captured scrollTop is restored on close in case the
  // overflow flip reset it. Cleanup runs on every close path (✕, backdrop,
  // Escape, result tap, route navigation).
  useEffect(() => {
    if (!open) return;
    if (!window.matchMedia(MOBILE_MQ).matches) return;
    document.documentElement.dataset.modalOpen = "true";
    const sc = document.getElementById("app-scroll");
    const prevOverflowY = sc?.style.overflowY ?? "";
    const prevScrollTop = sc?.scrollTop ?? 0;
    if (sc) sc.style.overflowY = "hidden";
    // The document itself can't scroll on touch (body overflow hidden), but
    // iOS sometimes nudges window scroll to reveal a focused input — pin it.
    const prevWinY = window.scrollY;
    return () => {
      delete document.documentElement.dataset.modalOpen;
      if (sc) {
        sc.style.overflowY = prevOverflowY;
        sc.scrollTop = prevScrollTop;
      }
      window.scrollTo(0, prevWinY);
    };
  }, [open]);

  // Desktop only: an anchored dropdown scrolls with the page, so close it on
  // scroll instead of letting it drift over the sticky header.
  useEffect(() => {
    if (!open || !closeOnDesktopScroll) return;
    function onScroll() {
      if (window.matchMedia("(min-width: 768px)").matches) onClose();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open, closeOnDesktopScroll, onClose]);

  if (!open) return null;

  // ---------------------------------------------------------------- desktop
  if (!isMobile) {
    return (
      <>
        {/* Transparent click-catcher. */}
        <button
          aria-label={`Close ${ariaLabel.toLowerCase()}`}
          onClick={onClose}
          tabIndex={-1}
          className="fixed inset-0 z-40"
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-label={ariaLabel}
          className={`z-50 flex flex-col bg-[color:var(--color-card)] border-[color:var(--card-border)] ${desktopClassName}`}
        >
          {children}
        </div>
      </>
    );
  }

  // ----------------------------------------------------------------- mobile
  // Portaled to <body>: the trigger renders inside #app-scroll (the touch
  // scroller), and keeping a fixed overlay inside a scrolling ancestor is
  // exactly the setup iOS mishandles around the keyboard. From <body> the
  // overlay is genuinely viewport-relative.
  return createPortal(
    // Overlay anchored to the VISUAL viewport: explicit height + translateY
    // glue it to the visible area, so the sheet's bottom edge sits on top of
    // the keyboard when it's open. (top+height set → the inset-0 bottom is
    // ignored per CSS; h-dvh is the pre-first-event fallback, correct because
    // nothing is focused at open.)
    <div
      className="fixed inset-x-0 top-0 z-50 h-dvh"
      style={{
        height: vvH != null ? `${vvH}px` : undefined,
        transform: vvTop > 0 ? `translateY(${vvTop}px)` : undefined,
      }}
    >
      {/* Backdrop — tap to close. */}
      <button
        aria-label={`Close ${ariaLabel.toLowerCase()}`}
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 bg-[color:var(--color-scrim)]"
      />

      {/* Sheet wrapper (slides up as one unit with the floating ✕). */}
      <div className="sheet-up absolute inset-x-0 bottom-0">
        {/* Floating close — Zomato-style placement, pixel styling: square,
            navy fill, lime border, hard shadow. */}
        <button
          onClick={onClose}
          aria-label={`Close ${ariaLabel.toLowerCase()}`}
          className="absolute -top-14 left-1/2 -translate-x-1/2 w-10 h-10 flex items-center justify-center border-[3px] active:translate-y-[1px]"
          style={{
            background: "#1a1340",
            color: "#fffaf0",
            borderColor: "var(--color-lime)",
            boxShadow: "3px 3px 0 rgba(0,0,0,0.4)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" shapeRendering="crispEdges" aria-hidden>
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </button>

        {/* Sheet body: opens at 85vh, capped to the visible viewport minus a
            small top gap while the keyboard is up. Consumers pin their input
            (flex-shrink-0) and scroll their results (flex-1 overflow-y-auto). */}
        <div
          role="dialog"
          aria-label={ariaLabel}
          className="flex h-[85vh] flex-col bg-[color:var(--color-card)] border-t-[3px] border-[color:var(--card-border)] pt-3"
          style={{ maxHeight: vvH != null ? `${vvH - 24}px` : undefined }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

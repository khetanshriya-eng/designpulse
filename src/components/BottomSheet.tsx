"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useModalA11y } from "@/lib/use-modal-a11y";

const MOBILE_MQ = "(max-width: 767px)";
/** Drag distance past which releasing the handle dismisses the sheet. */
const DISMISS_DRAG_PX = 110;

/**
 * Shared modal shell: a bottom sheet on mobile (slide-up, drag handle with
 * drag-to-dismiss, darkened scrim, body scroll lock, keyboard-aware sizing),
 * repositionable on desktop via `desktopClassName` (e.g. an anchored dropdown).
 * Used by the edition picker and the mobile search.
 *
 * Mechanics centralized here so every consumer gets the same guarantees:
 * - PullToRefresh stands down while open (data-modalOpen flag) — otherwise a
 *   downward drag on the sheet bubbles to #app-scroll and fires the refresh.
 * - The body is scroll-locked on mobile while open, so iOS can't shift the
 *   page to "reveal" a focused input; the exact scroll position is restored
 *   on close. ALL cleanup lives in effect returns, so it runs on every close
 *   path — backdrop tap, drag-dismiss, Escape, and route navigation.
 * - No autofocus on mobile (focusing an input would summon the keyboard the
 *   moment the sheet opens). Desktop gets the standard modal focus handling.
 * - When the keyboard IS open (user tapped an input), the sheet is lifted
 *   above it and capped to the visual viewport so pinned inputs stay visible.
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
  // Live drag-to-dismiss (mobile): dragY = px pulled down from rest; dragging
  // disables the snap-back transition so the sheet tracks the finger 1:1.
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Desktop-only focus trap + autofocus. On mobile, focusing the first control
  // would open the iOS keyboard immediately — exactly the layout-shift bug this
  // component exists to prevent. (Breakpoint sampled once; a mid-open desktop
  // resize is an edge we accept.)
  const [isDesktop] = useState(
    () => typeof window !== "undefined" && !window.matchMedia(MOBILE_MQ).matches
  );
  useModalA11y(open && isDesktop, panelRef, onClose);

  // Escape for the mobile sheet (hardware keyboards); on desktop the a11y hook
  // already handles Escape in the capture phase.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Mobile scroll lock + PTR stand-down. Cleanup restores the exact scroll
  // position and removes the flag no matter how the sheet closes.
  useEffect(() => {
    if (!open) return;
    if (!window.matchMedia(MOBILE_MQ).matches) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    document.documentElement.dataset.modalOpen = "true";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      delete document.documentElement.dataset.modalOpen;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
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

  // Keyboard-aware sizing (mobile): when the iOS keyboard opens, the visual
  // viewport shrinks — lift the sheet above the keyboard and cap its height so
  // the pinned input stays visible. Applied imperatively (not state) so vv
  // scroll/resize events don't churn renders; the panel remounts fresh per
  // open, so no stale styles linger.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const apply = () => {
      const panel = panelRef.current;
      if (!panel || !window.matchMedia(MOBILE_MQ).matches) return;
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      panel.style.bottom = inset > 0 ? `${inset}px` : "";
      panel.style.maxHeight = inset > 0 ? `${Math.round(vv.height * 0.9)}px` : "";
    };
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop — dims the page on mobile (bottom sheet), transparent
          click-catcher on desktop. */}
      <button
        aria-label={`Close ${ariaLabel.toLowerCase()}`}
        onClick={onClose}
        tabIndex={-1}
        className="fixed inset-0 z-40 max-md:bg-[color:var(--color-scrim)]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-label={ariaLabel}
        className={`sheet-up fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col bg-[color:var(--color-card)] border-t-[3px] border-[color:var(--card-border)] ${desktopClassName}`}
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 0.24s ease-out",
        }}
      >
        {/* Drag handle (mobile) — grab + pull down to dismiss. The sheet tracks
            the finger; past DISMISS_DRAG_PX it slides the rest of the way out
            and closes, otherwise it springs back. touch-none keeps the browser
            from scrolling/refreshing under the drag. */}
        <div
          className="md:hidden flex flex-shrink-0 justify-center pt-3 pb-2 cursor-grab touch-none"
          onTouchStart={(e) => {
            touchStartY.current = e.touches[0].clientY;
            setDragging(true);
          }}
          onTouchMove={(e) => {
            if (touchStartY.current == null) return;
            const dy = e.touches[0].clientY - touchStartY.current;
            setDragY(dy > 0 ? dy : 0);
          }}
          onTouchEnd={() => {
            setDragging(false);
            touchStartY.current = null;
            if (dragY > DISMISS_DRAG_PX) {
              // Finish the slide-out, then unmount.
              setDragY(window.innerHeight);
              window.setTimeout(() => {
                onClose();
                setDragY(0);
              }, 200);
            } else {
              setDragY(0);
            }
          }}
        >
          <span
            className="h-1.5 w-10 rounded-full"
            style={{ background: "rgba(26,19,64,0.3)" }}
          />
        </div>

        {children}
      </div>
    </>
  );
}

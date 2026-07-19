"use client";

import { useEffect, useState } from "react";

/**
 * Back-to-top pixel rocket. Appears after scrolling past one viewport,
 * smooth-scrolls to top on click. Fixed bottom-right, on the brand accent.
 */
export function ScrollTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // On touch devices the scroller is #app-scroll, not the document.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const sc = coarse ? document.getElementById("app-scroll") : null;
    const src: HTMLElement | Window = sc ?? window;
    const top = () => (sc ? sc.scrollTop : window.scrollY);
    const onScroll = () => setShow(top() > window.innerHeight);
    onScroll();
    src.addEventListener("scroll", onScroll as EventListener, { passive: true });
    return () => src.removeEventListener("scroll", onScroll as EventListener);
  }, []);

  if (!show) return null;

  const scrollToTop = () => {
    const sc = window.matchMedia("(pointer: coarse)").matches
      ? document.getElementById("app-scroll")
      : null;
    (sc ?? window).scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      className="fixed bottom-5 right-5 z-40 grid place-items-center w-11 h-11 border-[3px] text-[color:var(--color-paper)] shadow-[3px_3px_0_var(--card-shadow)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
      style={{ background: "var(--color-accent)", borderColor: "var(--card-border)" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" shapeRendering="crispEdges" aria-hidden>
        {/* Blocky upward chevron / rocket nose */}
        <rect x="11" y="4" width="2" height="16" />
        <rect x="9" y="6" width="2" height="2" />
        <rect x="13" y="6" width="2" height="2" />
        <rect x="7" y="8" width="2" height="2" />
        <rect x="15" y="8" width="2" height="2" />
        <rect x="5" y="10" width="2" height="2" />
        <rect x="17" y="10" width="2" height="2" />
      </svg>
    </button>
  );
}

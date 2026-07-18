"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * On touch devices the page scrolls inside #app-scroll (see globals.css), and
 * Next.js's built-in scroll handling only manages the window scroller — so
 * navigating to /about or /archive used to land mid-page wherever the
 * container last sat. Reset the container on every route change.
 *
 * The window reset is limited to coarse pointers: on desktop the document IS
 * the scroller and Next already scrolls new navigations to the top while
 * restoring position on back/forward — an unconditional reset would break
 * that restoration.
 */
export function ScrollReset() {
  const pathname = usePathname();
  useEffect(() => {
    document.getElementById("app-scroll")?.scrollTo(0, 0);
    if (window.matchMedia("(pointer: coarse)").matches) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  return null;
}

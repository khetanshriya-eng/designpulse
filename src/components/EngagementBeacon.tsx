"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const VISIT_KEY = "designator-visit";
const DWELL_MS = 5_000;

/** Random id for this browser-tab session only; nothing persistent. */
function visitId(): string | null {
  try {
    let id = sessionStorage.getItem(VISIT_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      sessionStorage.setItem(VISIT_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/**
 * Counts a page as read once the reader shows they're really there: 5 s with
 * the page visible, or a scroll, click, tap or key press. Bots and instant
 * bounces never send it, which is what the weekly "real readers" number
 * needs (Clarity's daily totals can't separate them).
 */
export function EngagementBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    let sent = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scroller = document.getElementById("app-scroll");

    const send = () => {
      if (sent) return;
      sent = true;
      cleanup();
      const v = visitId();
      if (!v) return;
      const payload = JSON.stringify({ v, p: pathname });
      try {
        if (!navigator.sendBeacon?.("/api/visit", new Blob([payload], { type: "text/plain" }))) {
          void fetch("/api/visit", { method: "POST", body: payload, keepalive: true });
        }
      } catch {
        /* never get in the way of reading */
      }
    };

    const startTimer = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") timer = setTimeout(send, DWELL_MS);
    };
    const onVisibility = () => (document.visibilityState === "visible" ? startTimer() : clearTimeout(timer));
    const onScroll = () => {
      const y = (scroller && scroller.scrollTop) || window.scrollY;
      if (y > 150) send();
    };
    const events = ["pointerdown", "keydown"] as const;

    function cleanup() {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      scroller?.removeEventListener("scroll", onScroll);
      for (const e of events) window.removeEventListener(e, send);
    }

    startTimer();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    for (const e of events) window.addEventListener(e, send);
    return cleanup;
  }, [pathname]);

  return null;
}

"use client";

import { useEffect } from "react";

/**
 * Counts clicks out to stories. Stories open their source in a new tab, so
 * this is the real "found something worth reading" signal (pages per visit
 * stays at 1 by design). Sends the story's address and the current page with
 * sendBeacon, which never delays the click. Nothing about the reader is sent.
 */
export function OutboundTracker() {
  useEffect(() => {
    const send = (e: MouseEvent) => {
      if (e.type === "auxclick" && e.button !== 1) return; // middle-click only
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      let url: URL;
      try {
        url = new URL(a.href);
      } catch {
        return;
      }
      if (url.host === location.host || !/^https?:$/.test(url.protocol)) return;
      const payload = JSON.stringify({ u: url.href, p: location.pathname });
      try {
        if (!navigator.sendBeacon?.("/api/out", new Blob([payload], { type: "text/plain" }))) {
          void fetch("/api/out", { method: "POST", body: payload, keepalive: true });
        }
      } catch {
        /* never get in the way of the click */
      }
    };
    document.addEventListener("click", send, { capture: true });
    document.addEventListener("auxclick", send, { capture: true });
    return () => {
      document.removeEventListener("click", send, { capture: true });
      document.removeEventListener("auxclick", send, { capture: true });
    };
  }, []);
  return null;
}

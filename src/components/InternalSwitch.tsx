"use client";

import { useEffect, useState } from "react";
import { isInternal } from "@/lib/internal";

/**
 * Confirms the "this is me" switch (src/lib/internal.ts) when a page is
 * opened with ?internal=on|off, then removes the parameter from the address.
 */
export function InternalSwitch() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const param = url.searchParams.get("internal");
    if (param !== "on" && param !== "off") return;
    const on = isInternal();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage(
      on
        ? "This browser is marked as yours. Your visits won't be counted."
        : "This browser counts as a normal visitor again."
    );
    url.searchParams.delete("internal");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] surface-card px-4 py-3 font-label text-[12px] text-ink max-w-[90vw]"
    >
      {message}
    </div>
  );
}

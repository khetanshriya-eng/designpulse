"use client";

import { useEffect } from "react";
import { LostState } from "@/components/LostState";

/**
 * Route error boundary. Catches render/data errors below the root layout and
 * shows a branded recovery screen instead of Next's unstyled default. The
 * layout (nav + footer) stays mounted around this.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in the browser console / Vercel logs for diagnosis.
    console.error("route error:", error);
  }, [error]);

  return (
    <LostState
      mood="jam"
      kicker="Our fault"
      title="The press jammed."
      body="Something went wrong on our side while loading this page. It's been logged, and trying again usually works."
      primary={{ onClick: reset, label: "Try again" }}
      secondary={{ href: "/", label: "Today's edition" }}
    />
  );
}

"use client";

import { useState } from "react";

/**
 * Prominent edition share: a bordered pixel button that copies the edition URL
 * and shows a pixel toast — bottom-center on mobile (snackbar), top-right on
 * desktop (toast). Fixed colors (cream button / navy toast) so it reads in both
 * themes regardless of the surrounding ink scope.
 */
export function ShareEditionButton({ editionUrl }: { editionUrl: string }) {
  const [showToast, setShowToast] = useState(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(editionUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = editionUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 2500);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        title="Copy this edition's link"
        aria-label="Copy this edition's link"
        className="shrink-0 self-start inline-flex items-center gap-2 p-2 sm:px-3 sm:py-2 border-[3px] border-[color:var(--card-border)] bg-[color:var(--color-card)] text-[#1a1340] shadow-[3px_3px_0_var(--card-shadow)] transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--card-shadow)] active:translate-x-0 active:translate-y-0"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" shapeRendering="crispEdges" aria-hidden>
          <rect x="5" y="5" width="9" height="9" stroke="currentColor" strokeWidth="2" />
          <path d="M3 11V3H11" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span className="font-pixel text-[11px] uppercase tracking-[0.06em] hidden sm:inline">
          Share
        </span>
      </button>

      {showToast && (
        <div
          role="status"
          className="fixed z-[100] bottom-6 left-1/2 -translate-x-1/2 sm:bottom-auto sm:left-auto sm:top-6 sm:right-6 sm:translate-x-0 px-4 py-3 font-mono text-[13px] border-[3px] [animation:slideUp_0.2s_ease]"
          style={{
            background: "#1a1340",
            color: "#fffaf0",
            borderColor: "var(--color-lime)",
            boxShadow: "4px 4px 0 var(--card-shadow)",
          }}
        >
          <span style={{ color: "var(--color-lime)" }} aria-hidden>
            ✦{" "}
          </span>
          Edition link copied to clipboard
        </div>
      )}
    </>
  );
}

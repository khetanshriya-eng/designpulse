"use client";

/**
 * The ✕ on the AttentionBanner. Writes the dismissal flag and hides the bar
 * live by adding `notice-dismissed` to <html> (CSS in globals hides it). The
 * pre-paint script in layout.tsx reads the same flag so it stays hidden on
 * future loads with no flash. Keep NOTICE_KEY in sync with that script.
 */
const NOTICE_KEY = "designator-notice-v1";

export function DismissNoticeButton() {
  function dismiss() {
    try {
      localStorage.setItem(NOTICE_KEY, "dismissed");
    } catch {
      /* ignore storage failures — bar just reappears next load */
    }
    document.documentElement.classList.add("notice-dismissed");
  }

  return (
    <button
      type="button"
      onClick={dismiss}
      aria-label="Dismiss notice"
      className="attention-dismiss"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        shapeRendering="crispEdges"
        aria-hidden
      >
        <rect x="3" y="3" width="2" height="2" />
        <rect x="5" y="5" width="2" height="2" />
        <rect x="7" y="7" width="2" height="2" />
        <rect x="9" y="9" width="2" height="2" />
        <rect x="11" y="11" width="2" height="2" />
        <rect x="11" y="3" width="2" height="2" />
        <rect x="9" y="5" width="2" height="2" />
        <rect x="5" y="9" width="2" height="2" />
        <rect x="3" y="11" width="2" height="2" />
      </svg>
    </button>
  );
}

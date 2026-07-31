"use client";

import Link from "next/link";

/**
 * "Re-subscribe" control for the AttentionBanner. On the homepage it intercepts
 * the click and smooth-scrolls to the #subscribe form (Next's soft-nav to a
 * same-page hash doesn't scroll the #app-scroll container reliably; scrollIntoView
 * does, on both desktop and touch). On any other page there's no form to scroll
 * to, so it falls through to a normal navigation to /#subscribe.
 */
export function ReSubscribeCTA({ className }: { className?: string }) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = document.getElementById("subscribe");
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <Link href="/#subscribe" onClick={handleClick} className={className}>
      Re-subscribe
    </Link>
  );
}

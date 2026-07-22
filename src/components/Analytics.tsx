"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Google Analytics 4 (gtag.js). Loaded via next/script (afterInteractive) with
 * two guards:
 *
 *  1. Production host only — never loads on localhost or *.vercel.app preview
 *     deploys, so your stats aren't polluted by dev/test traffic. (Checked
 *     client-side post-mount, which also keeps the static/ISR shell clean.)
 *  2. App Router pageviews — a client-side <Link> navigation isn't a full page
 *     load, so gtag's automatic pageview only fires once. The initial view is
 *     sent by `config`; each subsequent route change re-sends `page_view` on
 *     pathname change (query strings are intentionally omitted — no
 *     useSearchParams, which would force the layout dynamic and break caching).
 *
 * The CSP in next.config.ts is opened for exactly Google's hosts; without that
 * this would be blocked.
 */
const GA_ID = "G-X889ET99VX";
const PROD_HOSTS = new Set(["designatorapp.com", "www.designatorapp.com"]);

type GtagWindow = Window & {
  gtag?: (...args: unknown[]) => void;
};

export function Analytics() {
  const [enabled, setEnabled] = useState(false);
  const pathname = usePathname();
  const firstRun = useRef(true);

  useEffect(() => {
    // Post-mount on purpose: the host is only knowable client-side, and
    // deciding during render would hydration-mismatch the static shell (server
    // renders null, client would render the scripts).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(PROD_HOSTS.has(window.location.hostname));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // The initial pageview is handled by gtag `config` below; only send on
    // subsequent client navigations to avoid double-counting.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    (window as GtagWindow).gtag?.("event", "page_view", { page_path: pathname });
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}

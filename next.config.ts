import type { NextConfig } from "next";

/*
 * Content-Security-Policy. Defense-in-depth against XSS: even if a malicious
 * string reached the DOM, this constrains what it could do.
 *
 * script-src keeps 'unsafe-inline' on purpose: the alternative (per-request
 * nonces) requires middleware + dynamic rendering, which would break the
 * ISR/CDN caching the whole site depends on. So instead we lock down every
 * OTHER lever an injected script would reach for — base-uri (base-tag
 * hijacking), object-src (plugin embeds), form-action (credential
 * exfiltration to an attacker origin), frame-ancestors (clickjacking) — and
 * keep connect-src same-origin (no Supabase call is ever made from the
 * browser; every data fetch goes through our /api/* routes).
 *
 * img-src is intentionally broad (https:): article thumbnails come from ~75
 * arbitrary publisher domains.
 */
// Google Analytics (gtag.js) hosts. GA is otherwise blocked by the policy —
// the loader script comes from googletagmanager.com and the beacons POST to
// the analytics/doubleclick endpoints, none of which are 'self'.
const GA_SCRIPT = "https://www.googletagmanager.com";
const GA_CONNECT =
  "https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.g.doubleclick.net";

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' ${GA_SCRIPT}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${GA_CONNECT}`,
  "manifest-src 'self'",
  "frame-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          // Force HTTPS for two years, subdomains included (mail.* is MX-only,
          // www/apex are HTTPS on Vercel — no plain-HTTP host to break).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          // No legitimate embedder — block clickjacking via framing.
          { key: "X-Frame-Options", value: "DENY" },
          // Never MIME-sniff responses.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send origin-only referrer cross-origin (we link out constantly).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // We use none of these — deny by default.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

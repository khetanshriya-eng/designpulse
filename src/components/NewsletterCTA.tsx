"use client";

import { useState } from "react";

/**
 * Homepage email-capture CTA. Posts to /api/subscribe (Buttondown). Pixel
 * aesthetic: accent-tinted band with a blocky pixel envelope, corner pixel
 * blocks and ✦ sparkles. States: idle → loading → success (card swaps to a
 * confirmation) / error (message under the input). The hidden "website" field
 * is a spam honeypot the API checks.
 */
type Status = "idle" | "loading" | "success" | "error";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (res.ok && data.message) {
        setMessage(data.message);
        setStatus("success");
      } else {
        setMessage(data.error ?? "Something went wrong. Try again.");
        setStatus("error");
      }
    } catch {
      setMessage("Couldn't subscribe right now. Try again.");
      setStatus("error");
    }
  }

  return (
    <section
      id="subscribe"
      className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 scroll-mt-24"
    >
      {/* Multi-color pixel divider above the band. */}
      <div
        className="h-1.5 mb-8"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--color-lime) 0 12px, var(--color-hot) 12px 24px, var(--color-cyan) 24px 36px, var(--color-amber) 36px 48px)",
        }}
        aria-hidden
      />
      <div
        className="surface-card relative overflow-hidden p-7 sm:p-10"
        style={{
          background:
            "color-mix(in srgb, var(--color-accent) 10%, var(--color-card))",
        }}
      >
        {/* Decorative pixel blocks in the corners (clipped by the card). */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 right-0 w-5 h-5"
          style={{ background: "var(--color-lime)" }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-5 right-5 w-3 h-3"
          style={{ background: "var(--color-hot)" }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 w-4 h-4"
          style={{ background: "var(--color-cyan)" }}
        />

        {status === "success" ? (
          <p className="relative font-heading text-[1.6rem] sm:text-[2rem] leading-tight text-ink">
            <span style={{ color: "var(--color-accent)" }} aria-hidden>
              ✦{" "}
            </span>
            {message}
          </p>
        ) : (
          <div className="relative flex flex-col md:flex-row md:items-center gap-8">
            {/* Copy + form */}
            <div className="flex-1 min-w-0">
              <p className="font-pixel text-[12px] uppercase tracking-[0.16em] text-accent">
                Daily briefing
              </p>
              <h2 className="font-heading text-[1.8rem] sm:text-[2.3rem] leading-[1.05] text-ink mt-2 max-w-[18ch]">
                Get the top picks in your inbox each morning.
              </h2>
              <p className="text-[14px] text-ink-muted mt-3">
                7 curated stories. One email. No spam.
              </p>

              <form
                onSubmit={submit}
                className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-stretch max-w-[560px]"
              >
                {/* Honeypot — hidden from humans, untabbable. */}
                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute -left-[9999px] top-0 h-px w-px opacity-0"
                />
                {/* bg is the cream card surface (not bg-paper) so the dark
                    re-scoped ink text stays visible in dark mode too. */}
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                  aria-label="Email address"
                  className="flex-1 bg-[color:var(--color-card)] text-ink text-[15px] px-4 py-3 border-[3px] border-[color:var(--card-border)] outline-none placeholder:text-ink-subtle focus-visible:border-accent"
                  style={{ boxShadow: "3px 3px 0 var(--card-shadow)" }}
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="font-pixel text-[14px] uppercase tracking-[0.06em] px-6 py-3 border-[3px] border-[color:var(--card-border)] text-[#1a1340] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                  style={{
                    background: "var(--color-lime)",
                    boxShadow: "3px 3px 0 var(--card-shadow)",
                  }}
                >
                  {status === "loading" ? "…" : "Subscribe"}
                </button>
              </form>

              {status === "error" && (
                <p
                  className="mt-3 font-pixel text-[12px] uppercase tracking-[0.04em] text-accent"
                  role="alert"
                >
                  {message}
                </p>
              )}
            </div>

            {/* Pixel envelope graphic — decorative, desktop only. */}
            <div className="hidden md:block shrink-0 relative pr-4">
              <PixelEnvelope />
              <span
                aria-hidden
                className="absolute -top-2 -left-3 text-[18px]"
                style={{ color: "var(--color-hot)" }}
              >
                ✦
              </span>
              <span
                aria-hidden
                className="absolute top-6 -right-1 text-[12px]"
                style={{ color: "var(--color-cyan)" }}
              >
                ✦
              </span>
              <span
                aria-hidden
                className="absolute -bottom-3 left-6 text-[14px]"
                style={{ color: "var(--color-amber)" }}
              >
                ✦
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Blocky pixel envelope: dark frame, lime body, cream flap, hard offset. */
function PixelEnvelope() {
  return (
    <svg
      viewBox="0 0 48 40"
      className="w-[150px] h-auto"
      shapeRendering="crispEdges"
      aria-hidden
    >
      {/* hard offset shadow */}
      <rect x="9" y="13" width="36" height="24" fill="var(--card-shadow)" />
      {/* dark frame */}
      <rect x="5" y="9" width="36" height="24" fill="var(--color-ink)" />
      {/* lime body */}
      <rect x="7" y="11" width="32" height="20" fill="var(--color-lime)" />
      {/* flap (cream fill + dark pixel edges) */}
      <polygon points="7,11 23,24 39,11" fill="var(--color-card)" />
      <polyline
        points="7,11 23,24 39,11"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="2"
      />
    </svg>
  );
}

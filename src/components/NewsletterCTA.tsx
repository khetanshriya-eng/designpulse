"use client";

import { useState } from "react";

/**
 * Homepage email-capture CTA. Posts to /api/subscribe (Buttondown). Pixel
 * aesthetic: accent-tinted band, hard-bordered input, lime SUBSCRIBE button.
 * States: idle → loading → success (whole card swaps to a confirmation) /
 * error (message under the input, form stays usable). The hidden "website"
 * field is a spam honeypot the API checks.
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
      {/* Pixel divider above the band. */}
      <div
        className="h-1.5 mb-8"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--color-lime) 0 12px, var(--color-hot) 12px 24px, var(--color-cyan) 24px 36px, var(--color-amber) 36px 48px)",
        }}
        aria-hidden
      />
      <div
        className="surface-card p-7 sm:p-10"
        style={{
          background:
            "color-mix(in srgb, var(--color-accent) 10%, var(--color-card))",
        }}
      >
        {status === "success" ? (
          <p className="font-heading text-[1.6rem] sm:text-[2rem] leading-tight text-ink">
            <span style={{ color: "var(--color-accent)" }} aria-hidden>
              ✦{" "}
            </span>
            {message}
          </p>
        ) : (
          <>
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
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                aria-label="Email address"
                className="flex-1 bg-paper text-ink text-[15px] px-4 py-3 border-[3px] border-[color:var(--card-border)] outline-none placeholder:text-ink-subtle focus-visible:border-accent"
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
          </>
        )}
      </div>
    </section>
  );
}

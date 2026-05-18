"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (data.success) {
        setStatus("success");
        setMessage(data.message ?? "You're subscribed.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Try again.");
    }
  }

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="border-y border-rule bg-paper-warm"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <p className="font-heading text-[11px] uppercase tracking-[0.14em] font-bold text-accent mb-2">
            Daily briefing
          </p>
          <h2
            id="newsletter-heading"
            className="font-heading text-[1.6rem] sm:text-[2rem] leading-tight font-extrabold tracking-tight text-ink"
          >
            Get the edition in your inbox each morning.
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-muted max-w-md">
            One email a day. The summaries you see here, none of the noise. Free, no tracking pixels, unsubscribe in a click.
          </p>
        </div>

        {status === "success" ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 text-[14px] text-ink"
          >
            <span
              aria-hidden
              className="shrink-0 w-7 h-7 rounded-full bg-accent text-paper inline-flex items-center justify-center font-bold"
            >
              ✓
            </span>
            <span className="font-medium">{message}</span>
          </div>
        ) : (
          <form className="flex flex-col gap-2" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col sm:flex-row gap-3">
              <label htmlFor="newsletter-email" className="sr-only">
                Your email
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@studio.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                disabled={status === "loading"}
                aria-invalid={status === "error"}
                aria-describedby={status === "error" ? "newsletter-error" : undefined}
                className="flex-1 px-4 py-3 bg-paper border border-rule text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-ink rounded-sm disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="px-5 py-3 bg-ink text-paper text-[13px] font-heading font-bold uppercase tracking-[0.1em] hover:bg-accent transition-colors rounded-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "loading" ? "Subscribing…" : "Subscribe"}
              </button>
            </div>
            {status === "error" && message && (
              <p
                id="newsletter-error"
                role="alert"
                className="text-[12px] text-accent"
              >
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

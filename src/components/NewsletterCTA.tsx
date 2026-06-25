"use client";

import { useState } from "react";

/**
 * Homepage email-capture CTA. Posts to /api/subscribe (Buttondown). Styled as
 * a large article card — flat cream surface, 3px border, hard offset shadow —
 * so it reads as "a card among cards". On the right, a big pixel mailbox with
 * envelopes flying in and posting themselves. States: idle → loading →
 * success / error. The hidden "website" field is a honeypot.
 */
type Status = "idle" | "loading" | "success" | "error";

// Brand palette (literal so the illustration is stable across themes).
const NAVY = "#1a1340";
const PURPLE = "#5b3df5";
const CREAM = "#fffaf0";
const LIME = "#d4ff3f";
const PINK = "#ff4fd8";
const CYAN = "#00e5ff";

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

      {/* Flat card — same treatment as every article card, just wider. */}
      <div className="surface-card relative overflow-hidden p-7 sm:p-10">
        <div className="relative flex items-center gap-6">
          {/* Copy + form */}
          <div className="flex-1 min-w-0">
            {status === "success" ? (
              <p className="font-heading text-[1.6rem] sm:text-[2rem] leading-tight text-ink">
                <span className="text-accent" aria-hidden>
                  ✦{" "}
                </span>
                {message}
              </p>
            ) : (
              <>
                <p className="font-pixel text-[12px] uppercase tracking-[0.16em] text-accent">
                  Daily briefing
                </p>
                <h2 className="font-heading text-[2rem] sm:text-[2.3rem] leading-[1.05] text-ink mt-2">
                  Get the top picks in your
                  <br />
                  inbox each morning.
                </h2>
                <p className="text-[14px] text-ink-muted mt-3">
                  7 curated stories. One email. No spam.
                </p>

                <form
                  onSubmit={submit}
                  className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-stretch max-w-[520px]"
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
                    className="flex-1 bg-[color:var(--color-card)] text-ink text-[15px] px-4 py-3 border-[3px] border-[color:var(--card-border)] outline-none placeholder:text-ink-subtle focus-visible:border-accent shadow-[3px_3px_0_var(--card-shadow)]"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="font-pixel text-[14px] uppercase tracking-[0.06em] px-6 py-3 border-[3px] border-[color:var(--card-border)] text-[#1a1340] bg-[color:var(--color-lime)] shadow-[3px_3px_0_var(--card-shadow)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--card-shadow)] active:translate-x-0 active:translate-y-0 disabled:opacity-60"
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

          {/* Mailbox illustration with letters flying in — desktop only. */}
          <div className="hidden md:block shrink-0 relative w-[240px] h-[210px]" aria-hidden>
            <Mailbox />
            <FlyingLetter flap={PINK} delay="0s" top="2px" left="150px" />
            <FlyingLetter flap={LIME} delay="-1.2s" top="2px" left="150px" />
            <FlyingLetter flap={CYAN} delay="-2.4s" top="2px" left="150px" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Big blocky pixel mailbox on a post, with a raised pink flag. */
function Mailbox() {
  return (
    <svg
      viewBox="0 0 120 140"
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[190px] h-auto"
      shapeRendering="crispEdges"
    >
      {/* hard offset shadow */}
      <rect x="26" y="50" width="80" height="46" fill="var(--card-shadow)" opacity="0.25" />

      {/* post + base */}
      <rect x="54" y="86" width="12" height="46" fill={NAVY} />
      <rect x="44" y="128" width="32" height="6" fill={NAVY} />

      {/* domed top (navy outline behind, purple inset) */}
      <rect x="46" y="26" width="28" height="8" fill={NAVY} />
      <rect x="36" y="32" width="48" height="8" fill={NAVY} />
      <rect x="28" y="38" width="64" height="10" fill={NAVY} />
      <rect x="50" y="30" width="20" height="4" fill={PURPLE} />
      <rect x="40" y="36" width="40" height="4" fill={PURPLE} />
      <rect x="32" y="42" width="56" height="6" fill={PURPLE} />

      {/* body */}
      <rect x="20" y="46" width="80" height="44" fill={NAVY} />
      <rect x="24" y="50" width="72" height="36" fill={PURPLE} />

      {/* door + slot + knob */}
      <rect x="32" y="54" width="56" height="30" fill={NAVY} />
      <rect x="36" y="58" width="48" height="22" fill={CREAM} />
      <rect x="44" y="62" width="32" height="5" fill={NAVY} />
      <rect x="79" y="69" width="5" height="5" fill={LIME} />

      {/* flag (raised) */}
      <rect x="100" y="40" width="5" height="34" fill={NAVY} />
      <rect x="83" y="38" width="20" height="16" fill={NAVY} />
      <rect x="85" y="40" width="16" height="12" fill={PINK} />
    </svg>
  );
}

/** A small pixel envelope that flies in and posts itself (animated via CSS). */
function FlyingLetter({
  flap,
  delay,
  top,
  left,
}: {
  flap: string;
  delay: string;
  top: string;
  left: string;
}) {
  return (
    <div
      className="mail-fly absolute"
      style={{ top, left, ["--fly-delay" as string]: delay }}
    >
      <svg width="34" height="26" viewBox="0 0 24 18" shapeRendering="crispEdges">
        <rect x="0" y="0" width="24" height="18" fill={NAVY} />
        <rect x="2" y="2" width="20" height="14" fill={CREAM} />
        <polygon points="2,2 12,11 22,2" fill={flap} />
        <polyline points="2,2 12,11 22,2" fill="none" stroke={NAVY} strokeWidth="1.5" />
      </svg>
    </div>
  );
}

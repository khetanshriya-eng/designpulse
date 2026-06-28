"use client";

import { useState } from "react";

/**
 * Homepage email-capture CTA. Posts to /api/subscribe (Buttondown).
 *
 * Design: a cream pixel card (consistent with every article card) color-blocked
 * with a flat accent-purple panel — the same flat-color, hard-edged language as
 * the nav/footer chrome. The panel carries a bold, flat pixel-envelope mark
 * (gentle bob) and ✦ accents. No gradients, no dimensional illustration.
 * States: idle → loading → success / error. The hidden "website" field is a
 * honeypot.
 */
type Status = "idle" | "loading" | "success" | "error";

const NAVY = "#1a1340";
const CREAM = "#fffaf0";
const LIME = "#d4ff3f";
const CYAN = "#00e5ff";
const HOT = "#ff4fd8";

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
      className="site-container pb-16 scroll-mt-24"
    >
      {/* Signature multi-color pixel divider above the band. */}
      <div
        className="h-1.5 mb-8"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--color-lime) 0 12px, var(--color-hot) 12px 24px, var(--color-cyan) 24px 36px, var(--color-amber) 36px 48px)",
        }}
        aria-hidden
      />

      <div className="surface-card overflow-hidden">
        {status === "success" ? (
          <div className="p-7 sm:p-10">
            <p className="font-heading text-[1.7rem] sm:text-[2.1rem] leading-tight text-ink">
              <span className="text-accent" aria-hidden>
                ✦{" "}
              </span>
              {message}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_300px] items-stretch">
            {/* Copy + form */}
            <div className="p-7 sm:p-10">
              <p className="font-pixel text-[12px] uppercase tracking-[0.16em] text-accent">
                Daily briefing
              </p>
              <h2 className="font-heading text-[2rem] sm:text-[2.4rem] leading-[1.05] text-ink mt-2">
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
            </div>

            {/* Flat color-block panel with the envelope mark — desktop only. */}
            <div
              className="hidden md:flex relative items-center justify-center border-l-[3px] border-[color:var(--card-border)] overflow-hidden"
              style={{ background: "var(--color-accent)" }}
              aria-hidden
            >
              {/* corner pixel confetti */}
              <span className="absolute top-3 left-3 w-2.5 h-2.5" style={{ background: LIME }} />
              <span className="absolute bottom-3 right-3 w-2.5 h-2.5" style={{ background: CYAN }} />
              <span className="absolute bottom-5 left-5 w-2 h-2" style={{ background: HOT }} />

              {/* twinkling sparkles */}
              <span
                className="cta-twinkle absolute top-6 right-8 text-[18px] leading-none"
                style={{ color: LIME, ["--tw" as string]: "2.6s" }}
              >
                ✦
              </span>
              <span
                className="cta-twinkle absolute bottom-8 left-10 text-[13px] leading-none"
                style={{ color: CYAN, ["--tw" as string]: "3.4s", ["--twd" as string]: "-1.2s" }}
              >
                ✦
              </span>

              {/* the flat pixel envelope, gently bobbing */}
              <div className="cta-bob">
                <svg width="140" height="104" viewBox="0 0 52 38" shapeRendering="crispEdges">
                  {/* hard offset shadow */}
                  <rect x="5" y="6" width="46" height="32" fill={NAVY} opacity="0.35" />
                  {/* frame + cream body */}
                  <rect x="2" y="2" width="46" height="32" fill={NAVY} />
                  <rect x="4" y="4" width="42" height="28" fill={CREAM} />
                  {/* lime flap */}
                  <polygon points="4,4 25,21 46,4" fill={LIME} />
                  <polyline points="4,4 25,21 46,4" fill="none" stroke={NAVY} strokeWidth="2" />
                  {/* base seam detail */}
                  <rect x="4" y="30" width="42" height="2" fill={NAVY} />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

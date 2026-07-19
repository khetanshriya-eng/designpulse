"use client";

import { useRef, useState } from "react";
import { useModalA11y } from "@/lib/use-modal-a11y";

/**
 * Low-friction feedback: a floating trigger opens a small modal with four
 * pixel-emoji ratings + an optional comment. Submitting POSTs to /api/feedback,
 * which emails it — the user never leaves the page or opens a mail client.
 * The hidden "website" field is a spam honeypot the API checks.
 */
type Status = "idle" | "sending" | "done" | "error";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [honeypot, setHoneypot] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
    // reset shortly after, once the modal has animated away
    window.setTimeout(() => {
      setRating(0);
      setComment("");
      setHoneypot("");
      setStatus("idle");
    }, 200);
  }

  // Focus trap + Escape + focus restoration while open.
  useModalA11y(open, panelRef, close);

  async function submit() {
    if (!rating && !comment.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment, website: honeypot }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("done");
      window.setTimeout(close, 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Share feedback"
        className="surface-card fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 px-3 py-2 font-pixel text-[12px] uppercase tracking-[0.06em] text-ink"
      >
        <PixelFace mood={3} />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Share feedback"
        >
          <button
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 backdrop-blur-sm"
            style={{ backgroundColor: "var(--color-scrim)" }}
            tabIndex={-1}
          />
          <div
            ref={panelRef}
            className="relative w-full max-w-[380px] bg-paper text-ink rounded-xl ring-1 ring-rule shadow-2xl p-5"
          >
            {status === "done" ? (
              <div role="status" aria-live="assertive">
                <ThankYou />
              </div>
            ) : (
              <>
                <p className="font-pixel text-[12px] uppercase tracking-[0.12em] text-accent">
                  Feedback
                </p>
                <h2 className="font-heading text-[1.35rem] text-ink leading-tight mt-1 mb-4">
                  How&apos;s Designator?
                </h2>

                {/* Single-select rating → radiogroup semantics for AT. */}
                <div
                  role="radiogroup"
                  aria-label="Rate your experience"
                  className="flex justify-between gap-2 mb-4"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      onClick={() => setRating(n)}
                      aria-label={["", "Rough", "Meh", "Good", "Great"][n]}
                      aria-checked={rating === n}
                      className={`flex-1 grid place-items-center py-2 rounded-md border-2 transition-colors ${
                        rating === n
                          ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]"
                          : "border-rule hover:border-ink-subtle"
                      }`}
                    >
                      <PixelFace mood={n} />
                    </button>
                  ))}
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  aria-label="Additional feedback (optional)"
                  placeholder="Anything you'd change? (optional)"
                  rows={3}
                  className="w-full resize-none bg-paper-tint text-ink text-[14px] rounded-md p-3 outline-none ring-1 ring-rule focus:ring-accent placeholder:text-ink-subtle"
                />

                {/* Spam honeypot: visually hidden + untabbable; bots fill it. */}
                <input
                  type="text"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute -left-[9999px] top-0 h-px w-px opacity-0"
                />

                {/* Kept mounted so the announcement isn't missed by AT. */}
                <p
                  className="mt-2 text-[12px] text-accent"
                  role="alert"
                  style={{ display: status === "error" ? undefined : "none" }}
                >
                  Couldn&apos;t send — please try again.
                </p>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className="text-[13px] text-ink-subtle hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={status === "sending" || (!rating && !comment.trim())}
                    className="font-pixel text-[13px] uppercase tracking-[0.08em] bg-accent text-[color:var(--color-paper)] px-4 py-2 rounded-md disabled:opacity-50 transition-opacity"
                  >
                    {status === "sending" ? "Sending…" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* Celebratory success state: a grinning pixel face pops in with a burst of
   pixel sparkles flying outward. */
const SPARKS: { dx: number; dy: number; c: string }[] = [
  { dx: -26, dy: -20, c: "var(--color-lime)" },
  { dx: 26, dy: -20, c: "var(--color-hot)" },
  { dx: -32, dy: 6, c: "var(--color-cyan)" },
  { dx: 32, dy: 6, c: "var(--color-amber)" },
  { dx: -14, dy: -32, c: "var(--color-accent)" },
  { dx: 14, dy: -32, c: "var(--color-lime)" },
];

function ThankYou() {
  return (
    <div className="py-7 flex flex-col items-center gap-3">
      <div className="relative grid place-items-center">
        <span className="fb-pop inline-grid">
          <PixelFace mood={4} size={54} />
        </span>
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="fb-spark"
            style={{
              ["--spark-to" as string]: `translate(${s.dx}px, ${s.dy}px)`,
              background: s.c,
              animationDelay: `${0.18 + i * 0.03}s`,
            }}
          />
        ))}
      </div>
      <p className="font-heading text-[1.3rem] text-ink fb-rise">
        Thanks for the feedback!
      </p>
    </div>
  );
}

/* Blocky yellow pixel emoji; mood 1–4 sets the mouth (rough → great). */
const HEAD = [
  "..ooooo..",
  ".oyyyyyo.",
  "oyyyyyyyo",
  "oyyyyyyyo",
  "oyyyyyyyo",
  "oyyyyyyyo",
  "oyyyyyyyo",
  ".oyyyyyo.",
  "..ooooo..",
];
const MOUTHS: Record<number, [number, number][]> = {
  1: [[2, 7], [3, 6], [5, 6], [6, 7]], // frown
  2: [[3, 6], [4, 6], [5, 6]], // flat
  3: [[2, 6], [3, 7], [5, 7], [6, 6]], // smile
  4: [[2, 6], [3, 7], [4, 7], [5, 7], [6, 6], [3, 5], [5, 5]], // grin
};

function PixelFace({ mood, size = 26 }: { mood: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden>
      {HEAD.flatMap((row, y) =>
        row.split("").map((c, x) =>
          c === "." ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1.02"
              height="1.02"
              fill={c === "o" ? "#2d2b52" : "#ffd23f"}
            />
          )
        )
      )}
      {/* eyes */}
      <rect x="2.6" y="3" width="1.1" height="1.4" fill="#2d2b52" />
      <rect x="5.3" y="3" width="1.1" height="1.4" fill="#2d2b52" />
      {/* mouth */}
      {MOUTHS[mood]?.map(([x, y], i) => (
        <rect key={`m-${i}`} x={x} y={y} width="1.02" height="1.02" fill="#2d2b52" />
      ))}
    </svg>
  );
}

"use client";

import { useState } from "react";

/**
 * Low-friction feedback: a quiet footer trigger opens a small modal with four
 * pixel-emoji ratings + an optional comment. Submitting POSTs to /api/feedback,
 * which emails it — the user never leaves the page or opens a mail client.
 */
type Status = "idle" | "sending" | "done" | "error";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  function close() {
    setOpen(false);
    // reset shortly after, once the modal has animated away
    window.setTimeout(() => {
      setRating(0);
      setComment("");
      setStatus("idle");
    }, 200);
  }

  async function submit() {
    if (!rating && !comment.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("done");
      window.setTimeout(close, 1400);
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-white/70 hover:text-[color:var(--color-lime)] transition-colors"
      >
        Share feedback
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
          <div className="relative w-full max-w-[380px] bg-paper text-ink rounded-xl ring-1 ring-rule shadow-2xl p-5">
            {status === "done" ? (
              <p className="font-heading text-[1.2rem] text-ink py-6 text-center">
                Thanks! <span aria-hidden>✦</span>
              </p>
            ) : (
              <>
                <p className="font-pixel text-[12px] uppercase tracking-[0.12em] text-accent">
                  Feedback
                </p>
                <h2 className="font-heading text-[1.35rem] text-ink leading-tight mt-1 mb-4">
                  How&apos;s Designator?
                </h2>

                <div className="flex justify-between gap-2 mb-4">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={["", "Rough", "Meh", "Good", "Great"][n]}
                      aria-pressed={rating === n}
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
                  placeholder="Anything you'd change? (optional)"
                  rows={3}
                  className="w-full resize-none bg-paper-tint text-ink text-[14px] rounded-md p-3 outline-none ring-1 ring-rule focus:ring-accent placeholder:text-ink-subtle"
                />

                {status === "error" && (
                  <p className="mt-2 text-[12px] text-accent" role="alert">
                    Couldn&apos;t send — please try again.
                  </p>
                )}

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
                    className="font-pixel text-[13px] uppercase tracking-[0.08em] bg-accent text-white px-4 py-2 rounded-md disabled:opacity-50 transition-opacity"
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

function PixelFace({ mood }: { mood: number }) {
  return (
    <svg width="26" height="26" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden>
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

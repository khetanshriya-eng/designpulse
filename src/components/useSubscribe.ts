"use client";

import { useState } from "react";

export type SubscribeStatus = "idle" | "loading" | "success" | "error";

/** Remembered per browser so the top-of-page signup can step aside once done. */
export const SUBSCRIBED_KEY = "designator-subscribed";

/**
 * Shared signup logic for every subscribe form: posts to /api/subscribe
 * (Supabase list + Resend welcome). `website` is the honeypot field.
 */
export function useSubscribe() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<SubscribeStatus>("idle");
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
        try {
          localStorage.setItem(SUBSCRIBED_KEY, "1");
        } catch {
          /* storage blocked: the form simply keeps showing */
        }
      } else {
        setMessage(data.error ?? "Something went wrong. Try again.");
        setStatus("error");
      }
    } catch {
      setMessage("Couldn't subscribe right now. Try again.");
      setStatus("error");
    }
  }

  return { email, setEmail, website, setWebsite, status, message, submit };
}

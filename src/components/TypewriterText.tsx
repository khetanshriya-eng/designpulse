"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Section heading with a terminal-style blinking cursor.
 *
 * The heading is always shown in full. It used to type itself out on scroll,
 * but a reader scrolling past caught it half-typed ("Lat", "On the busines"),
 * which read as broken (2026-11-27 audit). Now only the cursor appears: it
 * blinks a few times when the heading first scrolls into view, then goes away.
 * No cursor without JS or under reduced motion.
 */
const BLINK_MS = 2400;

export function TypewriterText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setBlinking(true);
        timer = setTimeout(() => setBlinking(false), BLINK_MS);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <span ref={ref} className={className}>
      {text}
      {blinking && (
        <span className="nav-cursor ml-0.5" aria-hidden>
          ▮
        </span>
      )}
    </span>
  );
}

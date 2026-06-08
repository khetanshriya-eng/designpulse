"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Types `text` in character-by-character the first time it scrolls into view.
 *
 * SSR-safe + accessible: the initial state is the FULL string, so the server
 * HTML (and any no-JS / reduced-motion client) shows the complete heading.
 * Only when JS runs, motion is allowed, and the element enters the viewport do
 * we reset to 0 and type up — animating once, then settling on the full text.
 */
export function TypewriterText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  const [count, setCount] = useState(text.length);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (done.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !done.current) {
          done.current = true;
          setTyping(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!typing) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) clearInterval(id);
    }, 42);
    return () => clearInterval(id);
  }, [typing, text]);

  const complete = count >= text.length;
  return (
    <span ref={ref} className={className}>
      {text.slice(0, count)}
      {typing && !complete && (
        <span className="nav-cursor" aria-hidden>
          ▮
        </span>
      )}
    </span>
  );
}

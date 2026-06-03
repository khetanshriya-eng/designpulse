"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Result = {
  id: string;
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  sourceSlug: string;
  category: string;
};

export function SearchTrigger() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset everything and close. Handler-based reset avoids React 19's
  // set-state-in-effect warning.
  function closeModal() {
    setOpen(false);
    setQ("");
    setResults([]);
    setError(null);
  }

  // Global ⌘K / Ctrl+K to open search. Escape to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        // Setting open to false inside an event handler is fine.
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus the input when the modal opens.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced fetch. Only fires for queries with ≥2 trimmed chars; shorter
  // queries are filtered at render time (so we don't need to setState here
  // to clear results — they're derived from `q`).
  const trimmed = q.trim();
  const tooShort = trimmed.length < 2;
  useEffect(() => {
    if (!open || tooShort) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: ctrl.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { results: Result[] };
        setResults(data.results);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [trimmed, tooShort, open]);

  // Derived results: never show stale data for too-short queries.
  const visibleResults = tooShort ? [] : results;

  return (
    <>
      <button
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="p-2 -mr-2 rounded hover:bg-white/15 transition-colors [&_svg]:text-[color:var(--nav-ink)]"
      >
        <SearchIcon />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          {/*
            Scrim: theme-independent dark overlay (defined as --color-scrim in
            globals.css). Using bg-ink/40 here would invert in dark mode and
            wash everything out.
          */}
          <button
            aria-label="Close search"
            onClick={closeModal}
            className="absolute inset-0 backdrop-blur-sm"
            style={{ backgroundColor: "var(--color-scrim)" }}
            tabIndex={-1}
          />

          {/* Panel */}
          <div className="relative w-full max-w-[600px] bg-paper rounded-xl shadow-2xl ring-1 ring-rule overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4">
              <SearchIcon />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search articles, sources, topics…"
                className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-ink-subtle"
                aria-label="Search query"
              />
              <kbd className="hidden sm:inline-block text-[10px] uppercase tracking-wider text-ink-subtle bg-paper-tint rounded px-1.5 py-0.5">
                Esc
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto border-t border-rule">
              {tooShort && (
                <p className="px-5 py-8 text-sm text-ink-subtle text-center">
                  Type at least 2 characters to search.
                </p>
              )}
              {!tooShort && loading && (
                <p className="px-4 py-6 text-sm text-ink-subtle">Searching…</p>
              )}
              {!tooShort && error && (
                <p className="px-4 py-6 text-sm text-accent">
                  Couldn&apos;t search: {error}
                </p>
              )}
              {!tooShort && !loading && !error && visibleResults.length === 0 && (
                <p className="px-4 py-6 text-sm text-ink-subtle">
                  No matches for &ldquo;{q}&rdquo;.
                </p>
              )}
              {!loading && visibleResults.length > 0 && (
                <ul className="divide-y divide-rule">
                  {visibleResults.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={closeModal}
                        className="block px-4 py-3.5 hover:bg-paper-tint transition-colors"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="font-heading font-semibold text-[14.5px] text-ink leading-snug line-clamp-2">
                            {r.title}
                          </p>
                          <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
                            {r.sourceName}
                          </span>
                        </div>
                        {r.summary && (
                          <p className="mt-1 text-[13px] text-ink-muted line-clamp-2">
                            {r.summary}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-ink-muted shrink-0"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

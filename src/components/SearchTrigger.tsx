"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { formatRelativeTime } from "@/lib/format";
import { BottomSheet } from "./BottomSheet";
import { PixelLoader } from "./PixelLoader";

type Result = {
  id: string;
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  sourceSlug: string;
  category: string;
  categoryLabel: string;
  publishedAt: string | null;
};

/** Curated starting points shown in the mobile sheet before the user types. */
const POPULAR_SEARCHES = [
  "Figma",
  "AI tools",
  "design systems",
  "UX research",
  "portfolio",
  "typography",
  "Config",
];

const RECENTS_KEY = "designator-recent-searches";
const RECENTS_MAX = 5;
const MOBILE_MQ = "(max-width: 767px)";

function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr)
      ? arr.filter((s): s is string => typeof s === "string").slice(0, RECENTS_MAX)
      : [];
  } catch {
    return [];
  }
}

export function SearchTrigger() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Only read once per mount is fine — recents are also updated in-place via
  // setRecents whenever a search is saved/cleared.
  const [recents, setRecents] = useState<string[]>(loadRecents);
  // Mobile = bottom sheet, desktop = the classic centered overlay. Tracked
  // live so a resize/rotation swaps presentation on the next open.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Reset everything and close. Handler-based reset avoids React 19's
  // set-state-in-effect warning.
  function closeModal() {
    setOpen(false);
    setQ("");
    setResults([]);
    setError(null);
  }

  // Remember a query that led somewhere (user tapped a result). MRU, deduped
  // case-insensitively, capped.
  function saveRecent(term: string) {
    const t = term.trim();
    if (t.length < 2) return;
    setRecents((prev) => {
      const next = [
        t,
        ...prev.filter((p) => p.toLowerCase() !== t.toLowerCase()),
      ].slice(0, RECENTS_MAX);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* private mode etc. — recents just won't persist */
      }
      return next;
    });
  }

  function clearRecents() {
    try {
      localStorage.removeItem(RECENTS_KEY);
    } catch {
      /* ignore */
    }
    setRecents([]);
  }

  // Focus trap + Escape + focus restoration for the DESKTOP overlay only —
  // the mobile sheet brings its own a11y (and must not autofocus, since that
  // would summon the keyboard the moment it opens).
  useModalA11y(open && !isMobile, panelRef, closeModal);

  // Global shortcuts: ⌘K / Ctrl+K toggles search; "/" opens it (the pattern
  // designers expect). "/" is ignored while typing in a field so it doesn't
  // hijack a slash typed into the search box, feedback form, etc.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = e.target as HTMLElement | null;
        const typing =
          el &&
          (el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.isContentEditable);
        if (typing) return;
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus the input when the DESKTOP modal opens. Mobile: no autofocus.
  useEffect(() => {
    if (open && !isMobile) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, isMobile]);

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

      {/* ------------------------- Mobile: bottom sheet ------------------- */}
      <BottomSheet
        open={open && isMobile}
        onClose={closeModal}
        ariaLabel="Search"
      >
        {/* Input — pinned under the handle; 16px rule prevents iOS zoom. */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-3 border-b-[3px] border-[color:var(--card-border)]">
          <SearchIcon className="text-[#1a1340]/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search articles, sources, topics…"
            aria-label="Search query"
            className="flex-1 bg-transparent font-mono text-[14px] text-[#1a1340] placeholder:text-[#1a1340]/45 outline-none py-1"
          />
        </div>

        {/* Scroll area: suggestions before typing, results after. */}
        <div
          className="flex-1 min-h-[120px] overflow-y-auto overscroll-contain"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-live="polite"
        >
          {tooShort && (
            <div className="p-4 flex flex-col gap-6">
              <ChipGroup
                label="Popular"
                terms={POPULAR_SEARCHES}
                onPick={setQ}
              />
              {recents.length > 0 && (
                <ChipGroup
                  label="Recent"
                  terms={recents}
                  onPick={setQ}
                  onClear={clearRecents}
                />
              )}
            </div>
          )}
          {!tooShort && loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-10">
              <PixelLoader loading opacity={1} />
              <span className="font-mono text-[11px] text-[#1a1340]/55">
                Searching…
              </span>
            </div>
          )}
          {!tooShort && !loading && error && (
            <p className="p-4 text-center font-mono text-[12px] text-[#1a1340]/60">
              Couldn&apos;t search: {error}
            </p>
          )}
          {!tooShort && !loading && !error && visibleResults.length === 0 && (
            <p className="p-4 text-center font-mono text-[12px] text-[#1a1340]/60">
              No matches for &ldquo;{q}&rdquo;.
            </p>
          )}
          {!loading &&
            visibleResults.map((r) => (
              <Link
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  saveRecent(trimmed);
                  closeModal();
                }}
                className="block px-4 py-3 border-b border-[color:var(--card-border)]/20"
              >
                <p className="font-heading text-[15px] leading-[1.35] text-[#1a1340] line-clamp-2">
                  {r.title}
                </p>
                <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-[#1a1340]/55">
                  <span className="font-pixel uppercase tracking-[0.1em] text-[#5b3df5]">
                    {r.categoryLabel}
                  </span>
                  <span>{r.sourceName}</span>
                  {r.publishedAt && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{formatRelativeTime(r.publishedAt)}</span>
                    </>
                  )}
                </div>
              </Link>
            ))}
        </div>
      </BottomSheet>

      {/* ------------------------- Desktop: centered overlay --------------- */}
      {open && !isMobile && (
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

          {/* Panel. text-ink is explicit: the trigger lives in the purple nav
              (light text), and without this the modal would inherit that light
              color and the typed query would be invisible on the cream panel. */}
          <div
            ref={panelRef}
            className="relative w-full max-w-[600px] bg-paper text-ink rounded-xl shadow-2xl ring-1 ring-rule overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4">
              <SearchIcon />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search articles, sources, topics…"
                className="flex-1 bg-transparent outline-none text-[15px] text-ink placeholder:text-ink-subtle"
                aria-label="Search query"
              />
              <kbd className="hidden sm:inline-block text-[10px] uppercase tracking-wider text-ink-subtle bg-paper-tint rounded px-1.5 py-0.5">
                Esc
              </kbd>
            </div>

            {/* aria-live so result/status changes are announced to AT. */}
            <div
              className="max-h-[60vh] overflow-y-auto border-t border-rule"
              aria-live="polite"
            >
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
                        onClick={() => {
                          saveRecent(trimmed);
                          closeModal();
                        }}
                        className="block px-4 py-3.5 hover:bg-paper-tint transition-colors"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="font-heading text-[15px] text-ink leading-[1.4] line-clamp-2">
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
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-ink-subtle">
                          <span className="font-pixel uppercase tracking-[0.1em] text-accent">
                            {r.categoryLabel}
                          </span>
                          {r.publishedAt && (
                            <>
                              <span aria-hidden>·</span>
                              <span>{formatRelativeTime(r.publishedAt)}</span>
                            </>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Results count footer — only once there's something to count. */}
            {!tooShort && !loading && !error && visibleResults.length > 0 && (
              <div className="border-t border-rule px-4 py-2.5 text-center">
                <span className="font-mono text-[11px] text-ink-subtle">
                  {visibleResults.length} result
                  {visibleResults.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** A labeled row of pixel chips (Popular / Recent) for the mobile sheet. */
function ChipGroup({
  label,
  terms,
  onPick,
  onClear,
}: {
  label: string;
  terms: string[];
  onPick: (term: string) => void;
  onClear?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <p className="font-pixel text-[11px] uppercase tracking-[0.14em] text-[#1a1340]/55">
          {label}
        </p>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="font-mono text-[11px] text-[#1a1340]/55 underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {terms.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onPick(term)}
            className="font-mono text-[12px] px-2.5 py-1.5 border-2 border-[#1a1340] text-[#1a1340] shadow-[2px_2px_0_var(--card-shadow)] active:translate-x-px active:translate-y-px active:shadow-none transition-all"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchIcon({ className = "text-ink-muted" }: { className?: string }) {
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
      className={`shrink-0 ${className}`}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

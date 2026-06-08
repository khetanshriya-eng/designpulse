"use client";

/**
 * Scrolling headline ticker under the nav bar. The item list is duplicated
 * once and the track is animated by -50%, so the loop is seamless. Pauses on
 * hover. The duplicate copy is aria-hidden so screen readers announce each
 * headline only once. Motion is disabled under prefers-reduced-motion (see
 * globals.css), leaving a static, readable strip.
 */
type Item = { title: string; url: string };

function Row({ items, hidden }: { items: Item[]; hidden?: boolean }) {
  return (
    <div
      className="flex items-center shrink-0"
      aria-hidden={hidden}
    >
      {items.map((it, i) => (
        <a
          key={`${it.url}-${i}`}
          href={it.url}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={hidden ? -1 : undefined}
          className="font-pixel inline-flex items-center whitespace-nowrap text-[12px] uppercase tracking-[0.05em] px-4 py-1.5 hover:underline"
          style={{ color: "var(--color-lime)" }}
        >
          <span aria-hidden className="mr-3.5 opacity-60">
            ✦
          </span>
          {it.title}
        </a>
      ))}
    </div>
  );
}

export function Marquee({ items }: { items: Item[] }) {
  if (!items.length) return null;
  return (
    <div
      className="marquee-strip overflow-hidden"
      style={{ background: "var(--marquee-bg)" }}
      aria-label="Latest headlines"
    >
      <div className="marquee-track flex items-center w-max">
        <Row items={items} />
        <Row items={items} hidden />
      </div>
    </div>
  );
}

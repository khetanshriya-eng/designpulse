import Link from "next/link";

type Props = {
  kicker?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
};

export function SectionHeader({ kicker, title, description, href, hrefLabel }: Props) {
  return (
    // No full-width rule — bordered cards + spacing carry the separation. The
    // section is marked by a small pixel-block glyph on the kicker instead.
    <header className="flex items-end justify-between gap-4 mb-5">
      <div>
        {kicker && (
          <p className="font-pixel flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] font-bold text-accent mb-1.5">
            <span className="inline-flex gap-[2px]" aria-hidden>
              <span className="w-[5px] h-[5px]" style={{ background: "var(--color-lime)" }} />
              <span className="w-[5px] h-[5px]" style={{ background: "var(--color-accent)" }} />
            </span>
            {kicker}
          </p>
        )}
        <h2 className="font-heading text-[1.5rem] sm:text-[1.75rem] font-bold tracking-tight text-ink leading-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-[13px] text-ink-muted max-w-prose">
            {description}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="font-pixel hidden sm:inline-block text-[12px] text-ink-muted hover:text-accent transition-colors whitespace-nowrap"
        >
          {hrefLabel ?? "See more"} →
        </Link>
      )}
    </header>
  );
}

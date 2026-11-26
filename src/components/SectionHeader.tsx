import Link from "next/link";
import { TypewriterText } from "./TypewriterText";

type Props = {
  kicker?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  /** h1 when the section header is the page title (category pages). */
  as?: "h1" | "h2";
};

export function SectionHeader({ kicker, title, description, href, hrefLabel, as: Heading = "h2" }: Props) {
  return (
    // No full-width rule — bordered cards + spacing carry the separation. The
    // section is marked by a small pixel-block glyph on the kicker instead.
    <header className="flex items-end justify-between gap-4 mb-5">
      <div>
        {kicker && (
          <p className="font-label flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-accent mb-1.5">
            <span className="inline-flex gap-[2px]" aria-hidden>
              <span className="w-[5px] h-[5px]" style={{ background: "var(--color-lime)" }} />
              <span className="w-[5px] h-[5px]" style={{ background: "var(--color-accent)" }} />
            </span>
            {kicker}
          </p>
        )}
        <Heading className="font-heading text-[1.6rem] sm:text-[1.85rem] tracking-tight text-ink leading-tight">
          <TypewriterText text={title} />
        </Heading>
        {description && (
          <p className="mt-1.5 text-[13px] text-ink-muted max-w-prose">
            {description}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="font-label hidden sm:inline-block text-[12px] text-ink-muted hover:text-accent transition-colors whitespace-nowrap"
        >
          {hrefLabel ?? "See all"} →
        </Link>
      )}
    </header>
  );
}

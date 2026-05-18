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
    <header className="flex items-end justify-between gap-4 mb-5 rule-strong-top pt-3">
      <div>
        {kicker && (
          <p className="font-heading text-[11px] uppercase tracking-[0.14em] font-bold text-accent mb-1">
            {kicker}
          </p>
        )}
        <h2 className="font-heading text-[1.4rem] sm:text-[1.6rem] font-extrabold tracking-tight text-ink leading-none">
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
          className="hidden sm:inline-block text-[12px] text-ink-muted hover:text-accent transition-colors whitespace-nowrap"
        >
          {hrefLabel ?? "See more"} →
        </Link>
      )}
    </header>
  );
}

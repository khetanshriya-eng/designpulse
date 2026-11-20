import Link from "next/link";
import { ArticleImage } from "@/components/ArticleImage";
import { getEdition } from "@/lib/data/queries";
import { getEditionName } from "@/lib/editionName";
import { formatEditionDate } from "@/lib/format";

/**
 * A real edition, shown as the way forward from a dead end (a day with no
 * paper, a future date, a date before launch). The reader sees what they'd
 * get: edition name, date, top story and its image, not a bare date button.
 */
export async function EditionCard({ date, label, wide = false }: { date: string; label: string; wide?: boolean }) {
  const edition = await getEdition(date).catch(() => null);
  const hero = edition?.hero ?? null;
  return (
    <Link
      href={`/edition/${date}`}
      className={`surface-card group flex flex-col transition-transform hover:-translate-y-1 ${wide ? "md:col-span-2 md:flex-row" : ""}`}
    >
      {hero && (
        <div className={`border-b-[3px] border-[var(--card-border)] ${wide ? "md:w-[46%] md:shrink-0 md:border-b-0 md:border-r-[3px]" : ""}`}>
          <ArticleImage article={hero} aspect="video" size="md" />
        </div>
      )}
      <div className={`flex flex-1 flex-col gap-2 p-5 ${wide ? "md:justify-center md:p-8" : ""}`}>
        <p className="font-pixel text-[11px] uppercase tracking-[0.14em] text-accent">{label}</p>
        <p className="font-heading text-[1.35rem] leading-tight text-ink">{getEditionName(date)}</p>
        <p className="font-pixel text-[12px] uppercase tracking-[0.08em] text-ink-subtle">
          {formatEditionDate(date)}
        </p>
        {hero && (
          <p className="mt-1 text-[14px] leading-snug text-ink-muted line-clamp-2">
            Top story: {hero.title}
          </p>
        )}
        <span className="mt-auto pt-3 font-pixel text-[12px] uppercase tracking-[0.08em] text-ink group-hover:text-accent">
          Read this edition →
        </span>
      </div>
    </Link>
  );
}

/** One or two cards side by side, never stretched across a wide screen. */
export function EditionCards({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-heading text-[1.4rem] leading-tight text-ink">{title}</h2>
      <div className="grid gap-6 md:grid-cols-2">{children}</div>
    </div>
  );
}

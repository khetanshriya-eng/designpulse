import Link from "next/link";
import type { Article } from "@/data/articles";
import { SourceBadge } from "./SourceBadge";
import { ArticleImage } from "./ArticleImage";
import { SectionHeader } from "./SectionHeader";

export function InspirationStrip({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="inspiration-heading">
      <SectionHeader
        kicker="Look & feel"
        title="Inspiration picks"
        description="Fresh from Mobbin, Godly, Awwwards and Page Flows — visual references, not articles."
        href="/category/inspiration"
        hrefLabel="More inspiration"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        {articles.slice(0, 4).map((a) => (
          <Link
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <ArticleImage article={a} aspect="portrait" size="md" />
            <div className="pt-3 flex flex-col gap-1.5">
              <SourceBadge sourceId={a.sourceId} />
              <h3 className="font-heading text-[14px] font-semibold leading-snug text-ink group-hover:text-accent transition-colors line-clamp-2">
                {a.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

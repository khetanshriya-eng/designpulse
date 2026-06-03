import Link from "next/link";
import type { Article } from "@/data/articles";
import { SourceBadge } from "./SourceBadge";
import { ArticleImage } from "./ArticleImage";
import { formatReadTime } from "@/lib/format";

export function EditorsPick({ article }: { article: Article }) {
  const readTime = formatReadTime(article);
  return (
    <section aria-labelledby="editors-pick-heading">
      <Link
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block surface-card"
      >
        <ArticleImage
          article={article}
          aspect="wide"
          size="lg"
          className="brightness-[0.7] group-hover:brightness-[0.65] transition-[filter]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 max-w-[820px]">
          <p
            id="editors-pick-heading"
            className="font-heading text-[11px] uppercase tracking-[0.18em] font-bold text-accent-soft mb-3"
          >
            Editor&apos;s pick
          </p>
          <h3 className="font-heading text-[1.6rem] sm:text-[2rem] md:text-[2.4rem] leading-[1.05] font-extrabold text-white tracking-tight">
            {article.title}
          </h3>
          <p className="hidden sm:block mt-3 text-[14px] sm:text-[15px] leading-relaxed text-white/80 max-w-2xl">
            {article.summary}
          </p>
          <div className="mt-4 flex items-center gap-3 text-white">
            <div className="text-white [&_*]:text-white">
              <SourceBadge sourceId={article.sourceId} size="md" />
            </div>
            {readTime && (
              <span className="text-[12px] text-white/70 border-l border-white/30 pl-3">
                {readTime}
              </span>
            )}
          </div>
        </div>
      </Link>
    </section>
  );
}

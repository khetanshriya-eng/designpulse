import Link from "next/link";
import type { Article } from "@/data/articles";
import { SourceBadge } from "./SourceBadge";
import { ArticleImage } from "./ArticleImage";
import { formatReadTime } from "@/lib/format";

export function EditorsPick({ article }: { article: Article }) {
  const readTime = formatReadTime(article);
  return (
    <section aria-labelledby="editors-pick-heading" className="group">
      <Link
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block surface-card"
      >
        {/* Image sizing lives on this wrapper (fill mode) so the aspect can be
            responsive: taller 16/10 tile on mobile, cinematic 21/9 on md+. */}
        <div className="relative aspect-[16/10] md:aspect-[21/9]">
          <ArticleImage
            article={article}
            fill
            size="lg"
            className="md:brightness-[0.7] md:group-hover:brightness-[0.65] transition-[filter]"
          />
          {/* Legibility gradient only where text overlays the image (md+). */}
          <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        </div>
        {/* Text: on mobile a flat navy panel BELOW the image (in flow — grows
            with the title, so long titles can never clip against a fixed image
            height); on md+ the classic overlay pinned to the bottom. */}
        <div className="bg-[#1a1340] p-5 sm:p-6 md:bg-transparent md:absolute md:inset-x-0 md:bottom-0 md:p-10 md:max-w-[820px]">
          <p
            id="editors-pick-heading"
            className="font-pixel text-[11px] uppercase tracking-[0.18em] font-bold text-accent-soft mb-3"
          >
            Editor&apos;s pick
          </p>
          <h3 className="font-heading text-[1.7rem] sm:text-[2rem] md:text-[2.25rem] leading-[1.04] text-white tracking-tight">
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

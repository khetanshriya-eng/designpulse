import { CATEGORY_META, type SourceCategory } from "@/data/sources";

export function CategoryDot({ category }: { category: SourceCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-subtle font-medium">
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: meta.dotVar }}
        aria-hidden
      />
      {meta.short}
    </span>
  );
}

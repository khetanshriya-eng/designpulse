/**
 * Shared curate pipeline used by `scripts/curate.ts` and
 * `/api/cron/curate`. See pipeline/fetch.ts for the design rationale.
 */
import { createServiceClient } from "@/lib/db/client";
import type { ArticleRow, SourceRow } from "@/lib/db/types";
import { pickCuration, type Candidate } from "@/lib/curate/pick";
import { logger, type Logger } from "@/lib/logger";

export type CurateOptions = {
  dryRun?: boolean;
  windowHours?: number;
  mustReadCount?: number;
  log?: Logger;
};

export type CurateResult = {
  candidates: number;
  hero: { id: string; title: string; slug: string } | null;
  editorsPick: { id: string; title: string; slug: string } | null;
  mustReads: { id: string; title: string; slug: string }[];
  editionDate: string | null;
};

async function loadCandidates(windowHours: number): Promise<Candidate[]> {
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("articles")
    .select("*, sources(*)")
    .not("summary", "is", null)
    .neq("summary", "")
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(300);
  if (error) throw error;

  type Row = ArticleRow & { sources: SourceRow | SourceRow[] };
  return ((data ?? []) as Row[])
    .map((r) => {
      const src = Array.isArray(r.sources) ? r.sources[0] : r.sources;
      if (!src) return null;
      const { sources: _omit, ...rest } = r;
      void _omit;
      return { ...rest, source: src } as Candidate;
    })
    .filter((r): r is Candidate => r !== null);
}

export async function runCurate(opts: CurateOptions = {}): Promise<CurateResult> {
  const log = opts.log ?? logger("pipeline.curate");
  const dryRun = opts.dryRun ?? false;
  const windowHours = opts.windowHours ?? 48;
  const mustReadCount = opts.mustReadCount ?? 5;

  const supabase = createServiceClient();
  const candidates = await loadCandidates(windowHours);
  log.info("starting", { candidates: candidates.length, windowHours, mustReadCount, dryRun });

  if (candidates.length === 0) {
    log.warn("no candidates");
    return {
      candidates: 0,
      hero: null,
      editorsPick: null,
      mustReads: [],
      editionDate: null,
    };
  }

  const { hero, mustReads, editorsPick } = pickCuration(candidates, { mustReadCount });

  const summary: CurateResult = {
    candidates: candidates.length,
    hero: hero
      ? { id: hero.id, title: hero.title, slug: hero.source.slug }
      : null,
    editorsPick: editorsPick
      ? { id: editorsPick.id, title: editorsPick.title, slug: editorsPick.source.slug }
      : null,
    mustReads: mustReads.map((m) => ({ id: m.id, title: m.title, slug: m.source.slug })),
    editionDate: null,
  };

  if (dryRun) {
    log.info("dry run picks", summary as unknown as Record<string, unknown>);
    return summary;
  }

  // 1. Reset all flags. supabase-js refuses an unfiltered UPDATE; "id is not
  // null" is the cleanest always-true filter (clearer than the old
  // neq-magic-UUID idiom).
  const { error: resetErr } = await supabase
    .from("articles")
    .update({ is_featured: false, is_must_read: false })
    .not("id", "is", null);
  if (resetErr) throw resetErr;

  // 2. Flag hero.
  if (hero) {
    const { error } = await supabase
      .from("articles")
      .update({ is_featured: true })
      .eq("id", hero.id);
    if (error) throw error;
  }

  // 3. Flag must-reads.
  const mustReadIds = mustReads.map((m) => m.id);
  if (mustReadIds.length) {
    const { error } = await supabase
      .from("articles")
      .update({ is_must_read: true })
      .in("id", mustReadIds);
    if (error) throw error;
  }

  // 4. Upsert today's edition.
  const today = new Date().toISOString().slice(0, 10);
  const { error: edErr } = await supabase.from("editions").upsert(
    {
      edition_date: today,
      hero_article_id: hero?.id ?? null,
      editors_pick_id: editorsPick?.id ?? null,
    },
    { onConflict: "edition_date" }
  );
  if (edErr) throw edErr;

  log.info("edition written", { editionDate: today, hero: summary.hero?.id, editorsPick: summary.editorsPick?.id });
  return { ...summary, editionDate: today };
}

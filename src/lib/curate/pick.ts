/**
 * Heuristic auto-curation: pick one hero and a handful of must-reads from the
 * most recent summarized articles.
 *
 * No AI here — the signals are reliable enough on their own:
 *   - SOURCE PRIORITY TIER (dominant signal): tier-1 design sources lead, and
 *     tier-3 tech-news/gadget sources are barred from hero/editor's-pick/
 *     must-read entirely (they stay in the feed, never featured);
 *   - presence of a thumbnail (visual weight)
 *   - read_minutes ≥ 4 (substantive, not a quick link)
 *   - source type ≠ "forum" or "gallery" (avoid aggregators / Mobbin items)
 *   - off-brand deal/listicle filter (never feature a shopping roundup)
 *   - category diversity for must-reads (one per top category if possible)
 *
 * The picker takes an already-loaded set of candidate rows so it stays pure
 * and easy to test/seed.
 */
import type { ArticleRow, SourceRow } from "../db/types";
import { sourcePriority } from "@/data/sources";
import { isOffBrand } from "@/lib/content/filter";

export type Candidate = ArticleRow & { source: SourceRow };

type Score = { row: Candidate; score: number; reasons: string[] };

/**
 * Priority-tier bonus — the dominant ranking signal. Tier 1 (core design)
 * vastly outweighs everything else so a fresh Verge gadget review can no
 * longer out-score a design article. Tier 3 gets nothing and is additionally
 * barred from featuring (see FEATURABLE_TIER below).
 */
const TIER_BONUS: Record<1 | 2 | 3, number> = { 1: 25, 2: 5, 3: 0 };

/**
 * Small editorial nudge so marquee names lead *within* their tier. Secondary
 * to TIER_BONUS — fine-tuning, not the deciding factor.
 */
const MARQUEE: Record<string, number> = {
  nngroup: 4,
  smashing: 3,
  uxdesigncc: 3,
  designspells: 2,
  dense: 2,
  uxdw: 2,
  lennys: 3,
  stratechery: 2,
};

/** Tier 3 (tech-news/gadget) is never the hero, editor's pick, or a must-read. */
const FEATURABLE_TIER = 2;

const FORBIDDEN_TYPES = new Set(["forum", "gallery"]);

function scoreOne(row: Candidate): Score {
  let s = 0;
  const reasons: string[] = [];

  if (row.thumbnail_url) {
    s += 6;
    reasons.push("+6 thumbnail");
  }
  if (row.read_minutes && row.read_minutes >= 6) {
    s += 5;
    reasons.push(`+5 read=${row.read_minutes}m`);
  } else if (row.read_minutes && row.read_minutes >= 3) {
    s += 2;
    reasons.push(`+2 read=${row.read_minutes}m`);
  }
  if (row.duration_minutes && row.duration_minutes >= 15) {
    // Podcasts/videos: ≥15min is a substantive listen.
    s += 4;
    reasons.push(`+4 duration=${row.duration_minutes}m`);
  }
  if (row.summary && row.summary.length > 40) {
    s += 3;
    reasons.push("+3 summary");
  }
  const tier = sourcePriority(row.source.slug);
  s += TIER_BONUS[tier];
  reasons.push(`+${TIER_BONUS[tier]} tier${tier}`);
  const mq = MARQUEE[row.source.slug];
  if (mq) {
    s += mq;
    reasons.push(`+${mq} ${row.source.slug}`);
  }

  // Recency: newer articles get a small bump, but only enough to break ties.
  // (We're already filtering by date window upstream.)
  if (row.published_at) {
    const ageH =
      (Date.now() - new Date(row.published_at).getTime()) / 36e5;
    if (ageH < 24) {
      s += 3;
      reasons.push("+3 <24h");
    } else if (ageH < 48) {
      s += 1;
      reasons.push("+1 <48h");
    }
  }

  return { row, score: s, reasons };
}

export type CurationResult = {
  hero: Candidate | null;
  mustReads: Candidate[];
  editorsPick: Candidate | null;
  /** All rows scored, sorted desc — useful for debugging. */
  ranked: Score[];
};

export function pickCuration(
  rows: Candidate[],
  opts?: { mustReadCount?: number }
): CurationResult {
  const mustReadCount = opts?.mustReadCount ?? 5;

  // Filter out items we'd never feature.
  const eligible = rows.filter((r) => {
    if (FORBIDDEN_TYPES.has(r.source.type)) return false;
    if (!r.summary || r.summary.length < 20) return false; // need a real summary
    if (isOffBrand(r.title, r.original_url)) return false; // no deal/listicle features
    return true;
  });

  const ranked = eligible.map(scoreOne).sort((a, b) => b.score - a.score);

  // Featurable = tier 1/2 only. Tier 3 (tech-news/gadget) stays in the feed
  // via the display queries but is never the hero/pick/must-read — this is the
  // core of the "design should lead, not tech gadgets" reweight.
  const featurable = ranked.filter(
    (s) => sourcePriority(s.row.source.slug) <= FEATURABLE_TIER
  );

  // Hero: must be FRESH — the freshest design (tier-1) story with an image,
  // preferring the last 24h and widening to 36h then 48h; then any tier-1/2
  // with an image within 48h. `featurable` is score-sorted, so .find() returns
  // the best-scoring item inside each window (fresh window + quality tiebreak).
  // Candidates are already loaded from a 48h window upstream, so the hero is
  // never older than 48h. No tier-3 fallback.
  const now = Date.now();
  const ageHours = (r: Candidate) =>
    r.published_at ? (now - new Date(r.published_at).getTime()) / 36e5 : Infinity;
  const withImg = featurable.filter((s) => s.row.thumbnail_url);
  const t1 = (maxH: number) =>
    withImg.find(
      (s) => sourcePriority(s.row.source.slug) === 1 && ageHours(s.row) <= maxH
    );
  const heroScore =
    t1(24) ??
    t1(36) ??
    t1(48) ??
    withImg.find((s) => ageHours(s.row) <= 48) ??
    withImg[0] ??
    featurable[0] ??
    null;
  const hero = heroScore?.row ?? null;

  // Must-reads: walk featurable, prefer category diversity, skip the hero.
  const mustReads: Candidate[] = [];
  const usedCats = new Set<string>();
  for (const s of featurable) {
    if (mustReads.length >= mustReadCount) break;
    if (hero && s.row.id === hero.id) continue;
    if (usedCats.has(s.row.category)) continue;
    mustReads.push(s.row);
    usedCats.add(s.row.category);
  }
  // If strict diversity under-filled, top up with the next-highest featurable
  // items regardless of category.
  if (mustReads.length < mustReadCount) {
    for (const s of featurable) {
      if (mustReads.length >= mustReadCount) break;
      if (hero && s.row.id === hero.id) continue;
      if (mustReads.find((m) => m.id === s.row.id)) continue;
      mustReads.push(s.row);
    }
  }

  // Editor's pick: the next-best featurable item with a thumbnail, distinct
  // from the hero (a human curator's companion to the lead story).
  const editorsPick =
    featurable.find((s) => s.row.id !== hero?.id && s.row.thumbnail_url)?.row ??
    null;

  return { hero, mustReads, editorsPick, ranked };
}

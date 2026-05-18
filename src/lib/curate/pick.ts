/**
 * Heuristic auto-curation: pick one hero and a handful of must-reads from the
 * most recent summarized articles.
 *
 * No AI here — the signals are reliable enough on their own:
 *   - presence of a thumbnail (visual weight)
 *   - read_minutes ≥ 4 (substantive, not a quick link)
 *   - source type ≠ "forum" or "gallery" (avoid aggregators / Mobbin items)
 *   - source allow-list scoring (NN/g, Smashing, Lenny's, etc. rank higher)
 *   - category diversity for must-reads (one per top category if possible)
 *
 * The picker takes an already-loaded set of candidate rows so it stays pure
 * and easy to test/seed.
 */
import type { ArticleRow, SourceRow } from "../db/types";

export type Candidate = ArticleRow & { source: SourceRow };

type Score = { row: Candidate; score: number; reasons: string[] };

/**
 * Sources we trust to carry the day. Anything not in here still ranks, just
 * a touch lower. Numbers are additive bonuses on top of the baseline score.
 */
const SOURCE_WEIGHT: Record<string, number> = {
  nngroup: 12,
  smashing: 10,
  lennys: 10,
  firstround: 10,
  stratechery: 9,
  verge: 8,
  wired: 8,
  arstech: 7,
  uxdesigncc: 7,
  uxtigers: 7,
  itsnicethat: 6,
  techcrunch: 5,
  "9to5google": 5,
  uxdw: 6,
  designspells: 5,
  dense: 5,
};

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
  const w = SOURCE_WEIGHT[row.source.slug];
  if (w) {
    s += w;
    reasons.push(`+${w} ${row.source.slug}`);
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
    return true;
  });

  const ranked = eligible.map(scoreOne).sort((a, b) => b.score - a.score);

  // Hero: top-scoring item, must have a thumbnail.
  const heroScore = ranked.find((s) => s.row.thumbnail_url) ?? ranked[0] ?? null;
  const hero = heroScore?.row ?? null;

  // Must-reads: walk the ranked list, prefer category diversity, skip the hero.
  const mustReads: Candidate[] = [];
  const usedCats = new Set<string>();
  for (const s of ranked) {
    if (mustReads.length >= mustReadCount) break;
    if (hero && s.row.id === hero.id) continue;
    if (usedCats.has(s.row.category)) continue;
    mustReads.push(s.row);
    usedCats.add(s.row.category);
  }
  // If we couldn't hit the count with strict diversity, top up with the next
  // highest-scoring items regardless of category.
  if (mustReads.length < mustReadCount) {
    for (const s of ranked) {
      if (mustReads.length >= mustReadCount) break;
      if (hero && s.row.id === hero.id) continue;
      if (mustReads.find((m) => m.id === s.row.id)) continue;
      mustReads.push(s.row);
    }
  }

  // Editor's pick: the second-best scoring item (something a human curator
  // would put alongside the hero — different from the must-read grid).
  const editorsPick =
    ranked.find((s) => s.row.id !== hero?.id && s.row.thumbnail_url)?.row ?? null;

  return { hero, mustReads, editorsPick, ranked };
}

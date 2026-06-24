-- Designator — 0002: source priority tiers + article full-text search
-- Apply via Supabase SQL editor or `supabase db push`.
--
-- Both changes are additive and backward-compatible: existing code that
-- doesn't reference the new columns keeps working, and the app's search
-- degrades gracefully to ILIKE until `fts` exists. Safe to run anytime.

-- ---------------------------------------------------------------------------
-- sources.priority — curation tier. 1 = core design (dominates hero/must-read),
-- 2 = relevant/secondary (product, AI, quality tech), 3 = tech-news/gadget
-- (stays in the feed, never featured). Populated from sourcePriority() in
-- src/data/sources.ts on the next pipeline run (syncSourcesFromCode upserts it).
-- ---------------------------------------------------------------------------
alter table public.sources
  add column if not exists priority integer not null default 2;

create index if not exists idx_sources_priority on public.sources(priority);

-- ---------------------------------------------------------------------------
-- articles.fts — generated full-text search vector. Title weighted A (highest),
-- summary weighted B, so title matches rank above body matches. GIN-indexed.
-- ---------------------------------------------------------------------------
alter table public.articles
  add column if not exists fts tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  ) stored;

create index if not exists idx_articles_fts on public.articles using gin (fts);

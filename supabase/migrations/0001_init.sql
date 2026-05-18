-- DesignPulse — initial schema
-- Apply via Supabase SQL editor or `supabase db push` once linked.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------------
create table if not exists public.sources (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  url           text not null,
  feed_url      text,
  type          text not null check (type in (
                  'blog', 'newsletter', 'youtube', 'podcast',
                  'gallery', 'forum', 'publication'
                )),
  category      text not null check (category in (
                  'design-tools', 'ux-thinking', 'inspiration', 'youtube',
                  'product', 'tech-news', 'ai-tools', 'newsletters', 'podcasts'
                )),
  icon_url      text,
  -- Visual identity used by the prototype UI; carry it across to production
  initials      text,
  swatch        text,
  -- For YouTube channels, the resolved UC... channel id (used in feed URL).
  youtube_channel_id text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_sources_category on public.sources(category);
create index if not exists idx_sources_active on public.sources(is_active);

-- ---------------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------------
create table if not exists public.articles (
  id              uuid primary key default gen_random_uuid(),
  source_id       uuid not null references public.sources(id) on delete cascade,
  title           text not null,
  original_url    text not null unique, -- dedupe key
  summary         text,                  -- AI-generated 2-3 line summary
  thumbnail_url   text,                  -- OG image or video thumbnail
  author          text,
  published_at    timestamptz,
  fetched_at      timestamptz not null default now(),
  read_minutes    integer,
  duration_minutes integer,              -- for video/podcast
  category        text not null,
  content_type    text not null default 'article' check (content_type in (
                    'article', 'video', 'podcast-episode', 'gallery-item'
                  )),
  is_featured     boolean not null default false,
  is_must_read    boolean not null default false,
  raw_content     text,                  -- first ~6000 chars for re-summarization
  -- Useful future-proofing: a fingerprint to detect content changes on re-fetch.
  content_hash    text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_articles_published on public.articles(published_at desc);
create index if not exists idx_articles_category on public.articles(category);
create index if not exists idx_articles_source on public.articles(source_id);
create index if not exists idx_articles_featured on public.articles(is_featured) where is_featured;
create index if not exists idx_articles_must_read on public.articles(is_must_read) where is_must_read;

-- ---------------------------------------------------------------------------
-- editions (one per calendar day)
-- ---------------------------------------------------------------------------
create table if not exists public.editions (
  id              uuid primary key default gen_random_uuid(),
  edition_date    date not null unique,
  hero_article_id uuid references public.articles(id) on delete set null,
  editors_pick_id uuid references public.articles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sources_updated_at on public.sources;
create trigger trg_sources_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();

drop trigger if exists trg_editions_updated_at on public.editions;
create trigger trg_editions_updated_at
  before update on public.editions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- The Next.js app reads with the anon key; writes happen from cron jobs
-- holding the service-role key, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.sources  enable row level security;
alter table public.articles enable row level security;
alter table public.editions enable row level security;

drop policy if exists "sources are readable by anyone" on public.sources;
create policy "sources are readable by anyone"
  on public.sources for select
  using (is_active);

drop policy if exists "articles are readable by anyone" on public.articles;
create policy "articles are readable by anyone"
  on public.articles for select
  using (true);

drop policy if exists "editions are readable by anyone" on public.editions;
create policy "editions are readable by anyone"
  on public.editions for select
  using (true);

-- 0007: clicks out to stories.
--
-- Why: every story opens its source in a new tab, so "pages per visit" stays
-- at 1 even when a reader uses the site well. A click out to a story is the
-- real sign that someone found something worth reading. The browser sends a
-- beacon to /api/out on each click; the Monday report counts them.
--
-- Service-role only: RLS enabled with NO policies.
create table if not exists public.outbound_clicks (
  id          bigserial primary key,
  clicked_at  timestamptz not null default now(),
  day         date not null,              -- IST day
  url         text not null,              -- the story's address
  from_path   text,                       -- page the click came from
  host        text                        -- our host (previews are excluded from reports)
);
create index if not exists outbound_clicks_day_idx on public.outbound_clicks (day);
alter table public.outbound_clicks enable row level security;

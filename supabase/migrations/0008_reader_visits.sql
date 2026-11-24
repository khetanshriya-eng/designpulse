-- 0008: real reader visits.
--
-- Why: Clarity's export only gives daily totals, which include bots and
-- visits that bounce in under a second, so the weekly numbers overstated
-- readers. The site now records a page only once the reader has stayed 5 s
-- with it visible, or scrolled, clicked or typed. visit_id is a random id kept
-- for one browser-tab session (sessionStorage), so visits can be counted
-- without identifying anyone. Previews share the DB, so host lets reports
-- count production only.
--
-- Service-role only: RLS enabled with NO policies.
create table if not exists public.reader_visits (
  id        bigserial primary key,
  seen_at   timestamptz not null default now(),
  day       date not null,         -- IST day
  visit_id  text not null,
  path      text not null,
  host      text
);
create index if not exists reader_visits_day_idx on public.reader_visits (day);
alter table public.reader_visits enable row level security;

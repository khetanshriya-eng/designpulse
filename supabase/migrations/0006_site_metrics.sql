-- 0006: daily site metrics + weekly report log.
--
-- Why: Clarity's export API only returns the last 1–3 days, so a weekly
-- look-back can never see a full week. The 06:00 IST pipeline run now saves
-- the previous 24 h every day (metrics_daily), and on Mondays emails the
-- admin a 7-day report built from those rows (weekly_report_log keeps that
-- email exactly-once, like digest_log does for the digest).
--
-- Service-role only: RLS enabled with NO policies.
create table if not exists public.metrics_daily (
  day           date primary key,            -- IST day the numbers describe
  sessions      int,                         -- Clarity totalSessionCount (as Clarity reports it)
  bot_sessions  int,                         -- of those, flagged as bots by Clarity
  users         int,
  subscribers   int,                         -- active subscribers at capture
  clarity       jsonb,                       -- raw Clarity response (no dimension)
  clarity_source jsonb,                      -- raw Clarity response by Source
  fetched_at    timestamptz not null default now()
);
alter table public.metrics_daily enable row level security;

create table if not exists public.weekly_report_log (
  week_end  date primary key,                -- last day covered (a Sunday)
  sent_at   timestamptz not null default now()
);
alter table public.weekly_report_log enable row level security;

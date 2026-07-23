-- 0003: digest send log — one row per IST calendar day the digest went out.
--
-- Why: the daily email must be exactly-once. The pipeline sends it, and an
-- external watchdog (GitHub Actions, 03:15 UTC) re-triggers the send if the
-- morning run died — this table is what makes that retry SAFE (the send path
-- checks it and no-ops if today's row exists), so recovery can never
-- double-email subscribers.
--
-- Written via the service role only. RLS is enabled with NO policies: the
-- anon key can neither read nor write it.
create table if not exists public.digest_log (
  send_date   date primary key,
  sent_at     timestamptz not null default now(),
  recipients  int not null default 0,
  story_count int not null default 0
);

alter table public.digest_log enable row level security;

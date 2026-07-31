-- 0004: own the newsletter subscriber list.
--
-- Why: we send the digest via Resend and handle unsubscribes with our own
-- HMAC route, so Buttondown was only a dumb email store — and its permanent
-- suppression list blocked opted-out people from ever re-subscribing via the
-- form (no API override exists; verified 2026-07-31). Owning the list makes
-- re-subscribe a simple status flip and drops the Buttondown dependency.
--
-- Lifecycle: form signup → active. Unsubscribe (our /api/unsubscribe) →
-- status='unsubscribed' (row kept, so re-subscribing just flips it back —
-- the whole point). The digest sends only to status='active'.
--
-- Service-role only: RLS enabled with NO policies, so the anon key can neither
-- read the list (PII) nor write it. Subscribe/unsubscribe/digest all use the
-- service client (same pattern as digest_log).
create table if not exists public.subscribers (
  email            text primary key,               -- always stored lowercased
  status           text not null default 'active',  -- 'active' | 'unsubscribed'
  source           text,                            -- 'form' | 'import' | ...
  created_at       timestamptz not null default now(),
  unsubscribed_at  timestamptz,
  resubscribed_at  timestamptz,
  unsub_reason     text
);

-- Fast "active subscribers" scan for the digest.
create index if not exists subscribers_status_idx on public.subscribers (status);

alter table public.subscribers enable row level security;

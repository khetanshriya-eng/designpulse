-- Soft-bounce tracking for /api/resend-webhook.
-- A transient bounce (mail server unreachable, mailbox full) increments the
-- counter; a delivered email resets it; at 3 consecutive the address is
-- unsubscribed with unsub_reason = 'soft-bounced'. Without this, an address
-- whose server never accepts mail (Resend gives up after ~14 h and calls it
-- "transient") was emailed every day forever.
alter table public.subscribers
  add column if not exists soft_bounces integer not null default 0;

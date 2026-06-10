# Designator

A pixel-styled daily briefing for product designers, live at
[designatorapp.com](https://designatorapp.com). Aggregates ~70 sources
(RSS + YouTube + podcasts), summarizes them with Gemini → Groq fallback,
and picks the day's hero + must-reads twice a day.

## Local development

```bash
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

| Var                             | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (RLS-bound reads from the app)                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service-role key (cron + scripts; bypasses RLS)                 |
| `GEMINI_API_KEY`                | Primary summarization provider                                  |
| `GROQ_API_KEY`                  | Fallback summarization provider                                 |
| `CRON_SECRET`                   | Random string; auths every `/api/cron/*` call                   |
| `RESEND_API_KEY`                | Email sending (feedback + admin alerts)                         |
| `ADMIN_EMAIL`                   | Where pipeline-failure alerts go                                |
| `FEEDBACK_EMAIL` (optional)     | Feedback recipient (default `designatorapp@gmail.com`)          |
| `RESEND_FROM_EMAIL` (optional)  | Sender override (default `@designatorapp.com` addresses)        |
| `LOG_LEVEL` (optional)          | `debug` \| `info` \| `warn` \| `error`. Default `info`.         |
| `ANTHROPIC_API_KEY` (optional)  | Reserved for a future summarizer swap; not consumed yet         |

## Pipeline

The loop is **fetch → summarize → curate → display**. Each step lives in
`src/lib/pipeline/*` and is callable from both a CLI script and a
cron-protected API route:

| Step      | CLI                 | API route             |
| --------- | ------------------- | --------------------- |
| Fetch     | `npm run fetch`     | `/api/cron/fetch`     |
| Summarize | `npm run summarize` | `/api/cron/summarize` |
| Curate    | `npm run curate`    | `/api/cron/curate`    |
| All three | `npm run pipeline`  | `/api/cron/pipeline`  |

Each script supports `--dry-run`; the API routes accept the same options as
query params (`?limit=20`, `?slug=verge`, `?window-hours=72`).

`/api/cron/pipeline` runs fetch → summarize → curate sequentially in one
invocation — that's what the scheduled crons call.

### Manual trigger

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://designatorapp.com/api/cron/pipeline
```

## Deploy (Vercel)

1. Push to GitHub; Vercel auto-builds `main`.
2. Env vars from the table above must be set in Vercel **before** deploy
   (`CRON_SECRET` especially, or cron auth fails).
3. `vercel.json` schedules the pipeline twice daily (Hobby allows 2 crons):

   | Time (UTC) | IST     | Job      |
   | ---------- | ------- | -------- |
   | 02:30      | 8:00 AM | pipeline |
   | 14:30      | 8:00 PM | pipeline |

4. Vercel Cron auto-attaches `Authorization: Bearer $CRON_SECRET`.

### Hobby-tier timeout notes

Hobby caps `maxDuration` at 60s. All cron routes are set to 60s and every
pipeline step is **resumable**, so a partial run never corrupts state:

- **Fetch** upserts on `original_url` with `ignoreDuplicates: true`.
- **Summarize** only loads rows where `summary IS NULL`.
- **Curate** idempotently resets flags and upserts the day's `editions` row.

If `/api/cron/pipeline` regularly times out before curate, run
`npm run pipeline` locally, or upgrade to Pro and split the steps back into
separate crons with `maxDuration: 300`.

## Email (Resend)

`designatorapp.com` is a verified Resend domain. Feedback submissions
(`/api/feedback`) send from `feedback@designatorapp.com`; pipeline-failure
alerts send from `alerts@designatorapp.com` to `ADMIN_EMAIL`.

## Caching

Content changes only when the pipeline runs, so all read queries are wrapped
in `unstable_cache(revalidate: 600)` (see `src/lib/data/queries.ts`) — pages
serve from cache and refresh within 10 minutes of a pipeline run.

## Logging + monitoring

All cron/API routes log via `src/lib/logger.ts`:

- In production each call emits one JSON line per write
  (`{ level, scope, msg, ts, ... }`), queryable in Vercel Logs.
- Locally the same logger prints single `[level] scope: msg {meta}` lines.
- Set `LOG_LEVEL=debug` for per-source fetch detail.
- Pipeline failures additionally email `ADMIN_EMAIL` (see `src/lib/notify.ts`).

To inspect a cron run: Vercel → Logs → filter by `/api/cron/pipeline`, search
`"level":"error"`. Manual triggers return the full run summary as JSON, so
they double as a smoke test.

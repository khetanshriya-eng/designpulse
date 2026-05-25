# DesignPulse

A magazine-style daily briefing for product designers. Aggregates ~60 sources
(RSS + YouTube), summarizes them with Gemini → Groq fallback, picks the day's
hero + must-reads, and emails subscribers via Buttondown.

## Local development

```bash
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

| Var                            | Purpose                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`     | Supabase project URL                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Anon key (RLS-bound reads from the app)                      |
| `SUPABASE_SERVICE_ROLE_KEY`    | Service-role key (cron + scripts; bypasses RLS)              |
| `ANTHROPIC_API_KEY`            | Reserved for future summarization swap                       |
| `CRON_SECRET`                  | Random string. Used to auth every `/api/cron/*` + send-digest call |
| `BUTTONDOWN_API_KEY`           | Buttondown account API key (subscribe + send-digest)         |
| `LOG_LEVEL` (optional)         | `debug` \| `info` \| `warn` \| `error`. Default `info`.       |

## Pipeline

The full loop is **fetch → summarize → curate → display → digest**. Each step
lives in `src/lib/pipeline/*` and is callable from both a CLI script and a
cron-protected API route:

| Step      | CLI                  | API route               |
| --------- | -------------------- | ----------------------- |
| Fetch     | `npm run fetch`      | `/api/cron/fetch`       |
| Summarize | `npm run summarize`  | `/api/cron/summarize`   |
| Curate    | `npm run curate`     | `/api/cron/curate`      |
| All three | `npm run pipeline`   | `/api/cron/pipeline`    |
| Send      | —                    | `/api/send-digest`      |

Each script supports `--dry-run`; the API routes accept the same options as
query params (`?limit=20`, `?slug=verge`, `?window-hours=72`).

`/api/cron/pipeline` runs fetch → summarize → curate sequentially in a single
function invocation. Useful on Vercel Hobby, which caps the project at 2 daily
crons (one for the full pipeline, one for the digest send).

### Manual trigger

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://designpulse-app.vercel.app/api/cron/pipeline
```

## Deploy to Vercel

1. Push to GitHub and import the repo into Vercel.
2. Add the env vars from the table above to the Vercel project. `CRON_SECRET`
   must be set **before** the first deploy or cron jobs won't authenticate.
3. Vercel reads `vercel.json` automatically. Hobby-tier schedule (all UTC):

   | Time  | Job          | Why                                                              |
   | ----- | ------------ | ---------------------------------------------------------------- |
   | 05:00 | pipeline     | One-shot fetch → summarize → curate. ~6h headroom before digest. |
   | 11:30 | send-digest  | Email goes out ~6:30am ET / 3:30am PT.                           |

   Pro tier ($20/mo) lifts the 2-cron + daily-only limit; if you upgrade,
   replace `vercel.json` with the four-cron version (split fetch/summarize
   into morning + evening runs and `maxDuration = 300` on each route).

4. Vercel Cron auto-attaches `Authorization: Bearer $CRON_SECRET` to every
   scheduled call. No additional wiring needed.

### Hobby-tier timeout notes

Hobby caps `maxDuration` at 60s. All cron routes are set to 60s and every
pipeline step is **resumable**, so a partial run never corrupts state:

- **Fetch** upserts on `original_url` with `ignoreDuplicates: true`.
- **Summarize** only loads rows where `summary IS NULL`.
- **Curate** idempotently resets `is_featured`/`is_must_read` and upserts
  today's `editions` row on conflict.

If `/api/cron/pipeline` regularly times out before curate, run
`npm run pipeline` from your laptop instead, or upgrade to Pro.

## Logging + monitoring

All cron routes log via the structured logger in `src/lib/logger.ts`:

- In production each call emits a single JSON line per stdout write
  (`{ level, scope, msg, ts, ... }`), so Vercel Logs can be queried by field.
- Locally the same logger prints `[level] scope: msg {meta}` single lines.
- Set `LOG_LEVEL=debug` to see per-source detail; default is `info`.

To inspect a cron run in the Vercel dashboard:

1. Project → **Logs** → filter by route (`/api/cron/fetch`) and runtime.
2. Search for `"level":"error"` to find failures.
3. Each pipeline returns its summary in the response body, so manual triggers
   double as a smoke test (`curl -H "Authorization: Bearer $CRON_SECRET" …`).

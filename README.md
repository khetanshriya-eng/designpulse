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
| Send      | —                    | `/api/send-digest`      |

Each script supports `--dry-run`; the API routes accept the same options as
query params (`?limit=20`, `?slug=verge`, `?window-hours=72`).

### Manual trigger

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://designpulse.site/api/cron/fetch
```

## Deploy to Vercel

1. Push to GitHub and import the repo into Vercel (root = `designpulse/`).
2. Add the env vars from the table above to the Vercel project. `CRON_SECRET`
   must be set **before** the first deploy or cron jobs won't authenticate.
3. Vercel reads `vercel.json` automatically. Schedule (all UTC):

   | Time   | Job             | Why                                        |
   | ------ | --------------- | ------------------------------------------ |
   | 00:30  | curate          | Pick today's hero before any reader hits it |
   | 01:30  | send-digest     | Email goes out ~6:30am ET                  |
   | 06:00  | fetch (morning) | Catch the overnight US/EU publishing window |
   | 06:30  | summarize       | Run 30m after the fetch                    |
   | 18:00  | fetch (evening) | Catch the daytime publishing window         |
   | 18:30  | summarize       | Run 30m after the fetch                    |

   Hobby tier is limited to two daily crons — upgrade to Pro for the twice-daily
   pipeline, or trim `vercel.json` accordingly.

4. Vercel Cron auto-attaches `Authorization: Bearer $CRON_SECRET` to every
   scheduled call. No additional wiring needed.

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

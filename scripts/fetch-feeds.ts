/**
 * Pull articles from each active source, enrich them, and insert into the
 * articles table. Skips items whose `original_url` already exists.
 *
 * Modes:
 *   npm run fetch                       # full run, hits DB
 *   npm run fetch -- --dry-run          # parse + enrich only, no DB writes
 *   npm run fetch -- --limit 5          # only the first 5 active sources
 *   npm run fetch -- --only verge,figma # comma-separated slugs
 *
 * The actual logic lives in `src/lib/pipeline/fetch.ts` so the `/api/cron/fetch`
 * route can share it. This script is a thin CLI wrapper around `runFetch`.
 */
import { runFetch } from "../src/lib/pipeline/fetch";

type Args = { dryRun: boolean; limit: number | null; only: string | null };

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { dryRun: false, limit: null, only: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--only") args.only = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const result = await runFetch(args);

  console.log(
    `\nDone. ${result.totalItems} items across ${result.sourcesProcessed} sources, ${result.totalErrors} error(s).`
  );
  if (!args.dryRun) {
    console.log(`Inserted ${result.inserted} new articles.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

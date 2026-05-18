/**
 * Batch-summarize articles whose `summary` is still NULL.
 *
 * Usage:
 *   npm run summarize                       # default: 50 articles, concurrency 3
 *   npm run summarize -- --limit 20
 *   npm run summarize -- --concurrency 5
 *   npm run summarize -- --dry-run
 *   npm run summarize -- --slug verge       # only articles from one source
 *
 * Logic lives in `src/lib/pipeline/summarize.ts`. This script is a thin CLI
 * wrapper around `runSummarize`.
 */
import { runSummarize } from "../src/lib/pipeline/summarize";

type Args = {
  limit: number;
  concurrency: number;
  dryRun: boolean;
  slug?: string;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const out: Args = { limit: 50, concurrency: 3, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a === "--concurrency") out.concurrency = Number(argv[++i]);
    else if (a === "--slug") out.slug = argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs();
  const result = await runSummarize(args);
  console.log(
    `\nDone. processed=${result.processed} ok=${result.ok} skip=${result.skipped} failed=${result.failed}`
  );
  const mix = Object.entries(result.providerCounts)
    .map(([p, n]) => `${p}=${n}`)
    .join(", ");
  console.log(`Provider mix: ${mix || "—"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

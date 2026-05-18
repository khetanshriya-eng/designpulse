/**
 * Auto-curate the daily edition.
 *
 * Usage:
 *   npm run curate
 *   npm run curate -- --dry-run
 *   npm run curate -- --window-hours 72
 *   npm run curate -- --must-reads 6
 *
 * Logic lives in `src/lib/pipeline/curate.ts`. This script is a thin CLI
 * wrapper around `runCurate`.
 */
import { runCurate } from "../src/lib/pipeline/curate";

type Args = {
  dryRun: boolean;
  windowHours: number;
  mustReadCount: number;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const out: Args = { dryRun: false, windowHours: 48, mustReadCount: 5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--window-hours") out.windowHours = Number(argv[++i]);
    else if (a === "--must-reads") out.mustReadCount = Number(argv[++i]);
  }
  return out;
}

async function main() {
  const args = parseArgs();
  const result = await runCurate(args);

  console.log(`\nCandidates: ${result.candidates}`);
  if (result.hero) console.log(`HERO         [${result.hero.slug}] ${result.hero.title}`);
  else console.log("HERO         — none");
  if (result.editorsPick)
    console.log(`EDITOR PICK  [${result.editorsPick.slug}] ${result.editorsPick.title}`);
  for (const m of result.mustReads) {
    console.log(`MUST-READ    [${m.slug}] ${m.title}`);
  }
  if (result.editionDate) console.log(`\n✓ Wrote edition ${result.editionDate}.`);
  else if (args.dryRun) console.log("\n(dry run — no DB writes)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

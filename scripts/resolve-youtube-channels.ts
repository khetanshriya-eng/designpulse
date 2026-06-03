/**
 * Resolve each YouTube source's @handle URL into a UC... channel id by
 * scraping the channel page HTML. YouTube embeds the channel id in several
 * places; we look for the most reliable patterns.
 *
 * Run:
 *   npx tsx scripts/resolve-youtube-channels.ts
 *
 * Output is printed as a TypeScript object literal you can paste into
 * src/data/sources.ts (then re-seed). We don't mutate the DB directly so
 * src/data/sources.ts stays the source of truth.
 */
import { SOURCES } from "../src/data/sources";

const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "externalId",      re: /"externalId":"(UC[\w-]{20,24})"/ },
  { name: "channelId-json",  re: /"channelId":"(UC[\w-]{20,24})"/ },
  { name: "browseEndpoint",  re: /"browseId":"(UC[\w-]{20,24})"/ },
  { name: "og:url",          re: /<meta property="og:url" content="https?:\/\/www\.youtube\.com\/channel\/(UC[\w-]{20,24})/ },
  { name: "itemprop",        re: /<meta itemprop="(?:identifier|channelId)" content="(UC[\w-]{20,24})"/ },
];

async function resolveChannelId(handleUrl: string): Promise<{ id: string | null; via: string | null; status: number | null }> {
  try {
    const res = await fetch(handleUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DesignatorBot/0.1; +https://designpulse-app.vercel.app)",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return { id: null, via: null, status: res.status };
    const html = await res.text();
    for (const { name, re } of PATTERNS) {
      const m = html.match(re);
      if (m) return { id: m[1], via: name, status: res.status };
    }
    return { id: null, via: null, status: res.status };
  } catch (err) {
    return { id: null, via: `error: ${(err as Error).message}`, status: null };
  }
}

async function main() {
  const ytSources = SOURCES.filter((s) => s.type === "youtube");
  console.log(`Resolving ${ytSources.length} YouTube channel id(s)...\n`);

  const results: Array<{ slug: string; url: string; id: string | null; via: string | null }> = [];

  // YouTube doesn't love rapid-fire scraping; keep concurrency low.
  const CONCURRENCY = 3;
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= ytSources.length) return;
      const s = ytSources[i];
      const { id, via, status } = await resolveChannelId(s.url);
      results[i] = { slug: s.slug, url: s.url, id, via };
      const tag = id ? "✓" : "✗";
      const detail = id ? `${id} (via ${via})` : `unresolved (status ${status ?? "n/a"}, via ${via ?? "no match"})`;
      console.log(`  ${tag} ${s.slug.padEnd(20)} ${detail}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const resolved = results.filter((r) => r.id);
  console.log(`\nResolved ${resolved.length} / ${results.length} channels.\n`);

  // Print a TS object literal mapping slug → channel id, ready to paste.
  console.log("// Paste into src/data/sources.ts and use to populate `youtubeChannelId`:");
  console.log("export const YOUTUBE_CHANNEL_IDS: Record<string, string> = {");
  for (const r of resolved) {
    console.log(`  "${r.slug}": "${r.id}",`);
  }
  console.log("};");

  const failed = results.filter((r) => !r.id);
  if (failed.length) {
    console.log(`\n// Unresolved (${failed.length}) — check these URLs by hand:`);
    for (const f of failed) console.log(`//   ${f.slug.padEnd(20)} ${f.url}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

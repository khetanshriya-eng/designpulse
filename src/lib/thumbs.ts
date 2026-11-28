import "server-only";
import sharp from "sharp";
import { createServiceClient } from "@/lib/db/client";
import { MOSAIC_SOURCE_SLUGS } from "@/data/sources";
import type { Logger } from "@/lib/logger";

/**
 * Small story thumbnails, made once per story (migration 0009).
 *
 * Cards used to load each source's full-size original (1280–1600px) into
 * 150–450px tiles. A resizing proxy (wsrv.nl) helped on bytes but resized on
 * first view, so the first visitor still waited (2026-11-28). Now the pipeline
 * resizes each visible story's image to WebP at 640px and 1280px and stores it
 * in the public "thumbs" bucket; cards load those directly.
 *
 * Resumable: picks rows with thumb_path IS NULL, newest and most-visible
 * first. A failed original is marked '-' so it isn't retried every run; the
 * card then falls back to the proxy, the original, then the pixel mosaic.
 */
export const THUMB_BUCKET = "thumbs";
export const THUMB_WIDTHS = [640, 1280] as const;

const MAX_BYTES = 12 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;

type Row = {
  id: string;
  thumbnail_url: string | null;
  is_featured: boolean;
  is_must_read: boolean;
  sources: { slug: string } | { slug: string }[] | null;
};

/** Only public http(s) hosts: the URL comes from third-party feeds. */
function safeRemote(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const h = u.hostname.toLowerCase();
    if (
      h === "localhost" ||
      h.endsWith(".local") ||
      h.endsWith(".internal") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(h) ||
      h.includes(":")
    )
      return null;
    return u;
  } catch {
    return null;
  }
}

async function download(url: URL): Promise<Buffer> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DesignatorBot/1.0; +https://www.designatorapp.com/about)",
      Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const len = Number(res.headers.get("content-length") ?? "0");
  if (len > MAX_BYTES) throw new Error(`too large (${len} bytes)`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new Error("too large");
  return buf;
}

async function makeOne(row: Row): Promise<"ok" | "failed"> {
  const db = createServiceClient();
  const url = row.thumbnail_url ? safeRemote(row.thumbnail_url) : null;
  try {
    if (!url) throw new Error("unsafe or missing url");
    const input = await download(url);
    const meta = await sharp(input, { failOn: "none" }).metadata();
    // Tracking pixels and "no image" stubs: leave them to the mosaic.
    if (!meta.width || !meta.height || meta.width < 32 || meta.height < 32) {
      throw new Error("image too small");
    }
    for (const w of THUMB_WIDTHS) {
      const out = await sharp(input, { failOn: "none", animated: false })
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 72 })
        .toBuffer();
      const { error } = await db.storage
        .from(THUMB_BUCKET)
        .upload(`${row.id}/${w}.webp`, out, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: true,
        });
      if (error) throw new Error(`upload: ${error.message}`);
    }
    await db.from("articles").update({ thumb_path: row.id }).eq("id", row.id);
    return "ok";
  } catch (err) {
    await db.from("articles").update({ thumb_path: "-" }).eq("id", row.id);
    throw err;
  }
}

export async function runThumbs(opts: {
  limit?: number;
  concurrency?: number;
  /** Stop starting new images after this many ms (the run stays resumable). */
  budgetMs?: number;
  /** Look back this many days (backfill); default 3. */
  days?: number;
  log: Logger;
}): Promise<{ picked: number; made: number; failed: number; skipped: number; errors: string[] }> {
  const { limit = 30, concurrency = 4, budgetMs = 40000, days = 3, log } = opts;
  const started = Date.now();
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const db = createServiceClient();

  // Visible stories first: featured / must-read, then the newest summarized.
  const { data, error } = await db
    .from("articles")
    .select("id, thumbnail_url, is_featured, is_must_read, sources(slug)")
    .is("thumb_path", null)
    .not("thumbnail_url", "is", null)
    .not("summary", "is", null)
    .gte("published_at", since)
    .order("is_featured", { ascending: false })
    .order("is_must_read", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit * 2);
  if (error) throw new Error(`thumbs query failed: ${error.message}`);

  const slugOf = (r: Row) => (Array.isArray(r.sources) ? r.sources[0]?.slug : r.sources?.slug) ?? "";
  const rows: Row[] = [];
  let skipped = 0;
  for (const r of (data ?? []) as Row[]) {
    // Mosaic-only sources never show their image, so don't store it.
    if (MOSAIC_SOURCE_SLUGS.has(slugOf(r))) {
      skipped += 1;
      await db.from("articles").update({ thumb_path: "-" }).eq("id", r.id);
      continue;
    }
    if (rows.length < limit) rows.push(r);
  }

  let made = 0;
  let failed = 0;
  const errors: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < rows.length && Date.now() - started < budgetMs) {
      const row = rows[next++];
      try {
        await makeOne(row);
        made += 1;
      } catch (err) {
        failed += 1;
        if (errors.length < 8) errors.push(`${row.id}: ${(err as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  log.info("thumbs run", { picked: rows.length, made, failed, skipped, ms: Date.now() - started });
  return { picked: rows.length, made, failed, skipped, errors };
}

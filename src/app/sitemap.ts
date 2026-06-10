import type { MetadataRoute } from "next";
import { listEditionDates } from "@/lib/data/queries";
import { CATEGORY_META, type SourceCategory } from "@/data/sources";

const BASE = "https://designatorapp.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages.
  const entries: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/sources`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Category pages.
  for (const slug of Object.keys(CATEGORY_META) as SourceCategory[]) {
    entries.push({
      url: `${BASE}/category/${slug}`,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  // Edition archive (most recent 60; cached query, never block the sitemap
  // on a DB hiccup).
  try {
    const dates = await listEditionDates(60);
    for (const d of dates) {
      entries.push({
        url: `${BASE}/edition/${d}`,
        lastModified: new Date(`${d}T12:00:00Z`),
        changeFrequency: "never",
        priority: 0.4,
      });
    }
  } catch {
    // Sitemap still serves the static + category entries.
  }

  return entries;
}

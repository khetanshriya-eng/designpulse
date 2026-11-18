import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CATEGORY_META } from "@/data/sources";
import { CategoryListing, VALID_CATEGORIES, isValidCategory } from "./CategoryListing";

type Params = { slug: string };

// ISR: prerendered at build, refreshed every 10 minutes and whenever the
// pipeline revalidates content.
export const revalidate = 600;

export function generateStaticParams(): Params[] {
  return VALID_CATEGORIES.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidCategory(slug)) return { title: "Not found" };
  const meta = CATEGORY_META[slug];
  return {
    title: `${meta.label} · Designator`,
    description: `Latest in ${meta.label.toLowerCase()} across Designator's curated sources.`,
    // Page-level alternates replace the layout's, so RSS discovery is repeated.
    alternates: {
      canonical: `/category/${slug}`,
      types: { "application/rss+xml": "/api/rss" },
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (!isValidCategory(slug)) notFound();
  return <CategoryListing slug={slug} page={1} />;
}

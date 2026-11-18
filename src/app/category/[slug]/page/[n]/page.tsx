import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { CATEGORY_META } from "@/data/sources";
import { CategoryListing, isValidCategory } from "../../CategoryListing";

type Params = { slug: string; n: string };

export const revalidate = 600;

// Empty list = render each page on first visit, then serve it from the ISR
// cache (Next 16 needs generateStaticParams for runtime ISR on dynamic routes).
export function generateStaticParams(): Params[] {
  return [];
}

function parsePage(n: string): number | null {
  return /^[1-9]\d{0,4}$/.test(n) ? Number(n) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, n } = await params;
  const page = parsePage(n);
  if (!isValidCategory(slug) || !page) return { title: "Not found" };
  const meta = CATEGORY_META[slug];
  return {
    title: `${meta.label} · page ${page} · Designator`,
    description: `Older stories in ${meta.label.toLowerCase()} across Designator's curated sources.`,
    alternates: {
      canonical: `/category/${slug}/page/${page}`,
      types: { "application/rss+xml": "/api/rss" },
    },
  };
}

export default async function CategoryPageN({ params }: { params: Promise<Params> }) {
  const { slug, n } = await params;
  const page = parsePage(n);
  if (!isValidCategory(slug) || !page) notFound();
  if (page === 1) permanentRedirect(`/category/${slug}`);
  return <CategoryListing slug={slug} page={page} />;
}

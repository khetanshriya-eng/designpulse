import type { Article } from "@/data/articles";
import { MOSAIC_SOURCE_SLUGS } from "@/data/sources";

/**
 * Whether a card can show a real picture, known before render: the article
 * has a thumbnail and its source isn't one that always gets the pixel
 * placeholder. (An image that fails to load in the browser still falls back
 * to the mosaic inside ArticleImage.)
 */
export function hasRealImage(article: Article): boolean {
  return !!article.thumbnailUrl && !MOSAIC_SOURCE_SLUGS.has(article.sourceId);
}

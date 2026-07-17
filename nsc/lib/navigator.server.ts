import "server-only";
import type { NavigatorDomain, NavigatorTree } from "@/lib/navigator-types";
import talking from "@/content/navigator/talking.v1.json";

/**
 * Tree registry. A tree renders publicly only when its artifact says
 * status "published" (Matthew's review + D3 flip that bit). Drafts stay
 * visible in development and under NAVIGATOR_PREVIEW=1 so the whole flow
 * can be exercised before launch.
 */
const TREES: Partial<Record<NavigatorDomain, NavigatorTree>> = {
  talking: talking as unknown as NavigatorTree,
};

function previewAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NAVIGATOR_PREVIEW === "1"
  );
}

export function getTree(domain: string): NavigatorTree | null {
  const tree = TREES[domain as NavigatorDomain];
  if (!tree) return null;
  if (tree.status !== "published" && !previewAllowed()) return null;
  return tree;
}

export function visibleDomains(): Set<string> {
  const out = new Set<string>();
  for (const [slug, tree] of Object.entries(TREES)) {
    if (tree && (tree.status === "published" || previewAllowed())) out.add(slug);
  }
  return out;
}

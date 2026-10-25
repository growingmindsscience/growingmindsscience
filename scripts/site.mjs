// The public origin of the static site: the one place it is written down.
//
// Every generator in scripts/ (claims, explore, library, structured data, OG
// cards), the canonical check, and the Instagram scripts import SITE_ORIGIN
// from here. To move domains again: change SITE_ORIGIN, add the old origin to
// PREVIOUS_ORIGINS, then run
//
//   node scripts/check-canonicals.mjs --fix
//
// which rewrites the old origin in every deployed page, sitemap.xml and
// robots.txt, and rerun the generators. The class app (nsc/, its own Vercel
// project) keeps its own copy in nsc/lib/site.ts as DEFAULT_SITE_ORIGIN;
// check-canonicals.mjs fails if the two disagree.
//
// Must match the primary domain in Vercel (Settings > Domains on the static
// project). Today that is www, with the apex redirecting to it.

export const SITE_ORIGIN = "https://www.fromlittleonward.com";

// Origins the site used to live at. They redirect to SITE_ORIGIN (vercel.json
// and Vercel's domain settings) and must not appear in deployed files.
export const PREVIOUS_ORIGINS = [
  "https://growingmindsscience.com",
  "https://www.growingmindsscience.com",
];

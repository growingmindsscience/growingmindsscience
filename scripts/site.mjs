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

// Social card for pages without one of their own (check-canonicals.mjs --fix
// gives such pages this og:image and twitter:image).
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/assets/img/og/site-brand.png`;

// The Instagram account every footer and the homepage JSON-LD sameAs link to.
// check-canonicals.mjs fails on any other handle in a deployed page, and its
// --fix rewrites PREVIOUS_INSTAGRAM_HANDLES to this one.
export const INSTAGRAM_HANDLE = "fromlittleonward";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;
export const PREVIOUS_INSTAGRAM_HANDLES = ["growingmindsscience"];

// Origins the site used to live at. They redirect to SITE_ORIGIN (vercel.json
// and Vercel's domain settings) and must not appear in deployed files.
export const PREVIOUS_ORIGINS = [
  "https://growingmindsscience.com",
  "https://www.growingmindsscience.com",
];

// HTML-escape text for an element or attribute.
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Typographic quotes for visible text, applied after esc() (which only produces &...; entities, so
// no straight quote it emits is touched). Opening single quotes follow a space, a bracket, an
// opening double quote or the start; every other straight apostrophe is a closing quote or an
// apostrophe. Certified wording is unchanged; only the glyphs are. Shared by build-claims.mjs
// and build-explore.mjs so the two generators set quotes the same way.
export const smartQuotes = (s) => s
  .replace(/(^|[\s(“])'(?=[\w\d])/g, "$1‘")
  .replace(/'/g, "’")
  .replace(/(^|[\s(])&quot;(?=\S)/g, "$1“")
  .replace(/&quot;/g, "”");

// Escaped, typographically quoted visible text.
export const txt = (s) => smartQuotes(esc(s));

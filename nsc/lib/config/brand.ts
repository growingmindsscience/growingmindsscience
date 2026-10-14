/**
 * Number Path — brand + product strings.
 * Single source of truth for consumer-facing naming (mirrors the
 * lib/config/brand.ts pattern in growingmindslaw).
 *
 * Codename everywhere in code, schema, and artifacts stays `nsc`.
 */
export const brand = {
  productName: "Number Path",
  codename: "nsc",
  assessmentName: "The Feed-the-Bear Game",
  tagline: "Reading together, but numbers.",
  parentSite: "Growing Minds Science",
  parentSiteUrl: "https://growingmindsscience.com",
  // §3.1(6) — static neutral footer, rendered on every readout, never
  // conditionally triggered or alarmed.
  enrichmentFooter:
    "This is an enrichment tool, not a medical or developmental screening. " +
    "For questions about your child's development, talk with your pediatrician.",
} as const;

/**
 * Visual tokens follow the LIVE site DESIGN.md ("The Terrain": map-white
 * sheet, navy ink, one teal route; no orange or warm accent), not the
 * spec's stale "Deep Teal / Amber / Warm Cream" note. Ladder rails render in
 * the route teal; the current-rung field is the route tint.
 */
export const tokens = {
  ground: "#F3F5F0", // map-white sheet
  surface: "#FBFCFA",
  ink: "#1B2A3A", // navy ink
  inkDeep: "#1B2A3A",
  teal: "#1E5F62", // action / ladder rails
  tealSoft: "#17494B",
  rungGlow: "#D5E6E3", // route tint — current-rung highlight field
  seaGlass: "#E2E9E4",
} as const;

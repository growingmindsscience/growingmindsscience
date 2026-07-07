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
 * Visual tokens follow the LIVE site DESIGN.md (Cool-Ground Rule: mist
 * ground, never cream; one warm accent), not the spec's stale
 * "Deep Teal / Amber / Warm Cream" note. Ladder rails render in brand
 * teal; the current-rung glow uses the site's single warm accent.
 */
export const tokens = {
  ground: "#F0F5F3", // mist
  surface: "#FFFFFF",
  ink: "#15393C", // pine
  inkDeep: "#0E2A2D", // pine-deep
  teal: "#1E5F62", // action / ladder rails
  tealSoft: "#2E7A77",
  rungGlow: "#F8E7E0", // coral-tint — current-rung highlight field
  seaGlass: "#CFE3DE",
} as const;

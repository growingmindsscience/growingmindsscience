/**
 * The certified artifacts the app loads at runtime, by cert-report name.
 * Shared by lib/content.server.ts and the CI test that proves every shipped
 * file matches a passing entry in content/cert/cert.report.full.json.
 */
export const ARTIFACT_FILES = {
  "games.catalog": "games.catalog.v1.json",
  "assessment.copy": "assessment.copy.v1.json",
  "prompts.deck": "prompts.deck.v1.json",
  citations: "citations.v1.json",
} as const;

export type ArtifactName = keyof typeof ARTIFACT_FILES;

/** The report the runtime verifies against (full-mode compile). */
export const RUNTIME_CERT_REPORT = "cert/cert.report.full.json";

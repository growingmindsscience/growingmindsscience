/**
 * Certified-artifact loader — spec §7.3: the runtime refuses to load any
 * artifact whose content hash lacks a matching PASSING cert report.
 *
 * Uses Web Crypto so it runs in node, edge, and browser alike.
 */

export interface CertReportEntry {
  artifact: string;
  sha256: string;
  mode: "gold" | "full";
  pass: boolean;
}

export interface CertReportFile {
  mode: "gold" | "full";
  pass: boolean;
  reports: CertReportEntry[];
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class UncertifiedArtifactError extends Error {
  constructor(artifact: string, reason: string) {
    super(`refusing to load artifact "${artifact}": ${reason}`);
    this.name = "UncertifiedArtifactError";
  }
}

/**
 * Parse `raw` as artifact JSON only if the cert report contains a passing
 * entry whose sha256 matches the exact bytes provided.
 */
export async function loadCertifiedArtifact<T>(
  artifactName: string,
  raw: string,
  report: CertReportFile,
): Promise<T> {
  const entry = report.reports.find((r) => r.artifact === artifactName);
  if (!entry) {
    throw new UncertifiedArtifactError(artifactName, "no cert report entry");
  }
  if (!entry.pass) {
    throw new UncertifiedArtifactError(artifactName, "cert report is red");
  }
  const hash = await sha256Hex(raw);
  if (hash !== entry.sha256) {
    throw new UncertifiedArtifactError(
      artifactName,
      `hash mismatch (report ${entry.sha256.slice(0, 12)}…, got ${hash.slice(0, 12)}…)`,
    );
  }
  return JSON.parse(raw) as T;
}

import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCertifiedArtifact, type CertReportFile } from "@/lib/artifacts";
import type {
  AssessmentCopy,
  CitationsTable,
  GamesCatalog,
  PromptsDeck,
} from "@/lib/content-types";

/**
 * Runtime content access. Every artifact is loaded from its exact committed
 * bytes and verified against the frozen full-mode cert report (spec §7.3):
 * a hash mismatch or a red report throws, so the app cannot serve uncertified
 * content. Parsed results are cached for the process lifetime.
 */
const CONTENT_DIR = join(process.cwd(), "content");

let reportCache: CertReportFile | null = null;
function certReport(): CertReportFile {
  if (!reportCache) {
    const raw = readFileSync(
      join(CONTENT_DIR, "cert", "cert.report.full.json"),
      "utf8",
    );
    reportCache = JSON.parse(raw) as CertReportFile;
  }
  return reportCache;
}

const cache = new Map<string, unknown>();

async function load<T>(artifactName: string, file: string): Promise<T> {
  if (cache.has(artifactName)) return cache.get(artifactName) as T;
  const raw = readFileSync(join(CONTENT_DIR, file), "utf8");
  const parsed = await loadCertifiedArtifact<T>(artifactName, raw, certReport());
  cache.set(artifactName, parsed);
  return parsed;
}

export function getGamesCatalog(): Promise<GamesCatalog> {
  return load<GamesCatalog>("games.catalog", "games.catalog.v1.json");
}
export function getAssessmentCopy(): Promise<AssessmentCopy> {
  return load<AssessmentCopy>("assessment.copy", "assessment.copy.v1.json");
}
export function getPromptsDeck(): Promise<PromptsDeck> {
  return load<PromptsDeck>("prompts.deck", "prompts.deck.v1.json");
}
export function getCitations(): Promise<CitationsTable> {
  return load<CitationsTable>("citations", "citations.v1.json");
}

export const ARTIFACT_VERSION = "v1";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCertifiedArtifact, type CertReportFile } from "../lib/artifacts";
import { ARTIFACT_FILES, RUNTIME_CERT_REPORT } from "../lib/content-files";

/**
 * N14: CI's `npm run cert` certifies the GOLD exemplars, but production
 * refuses to serve any shipped artifact whose bytes don't match a passing
 * entry in the FULL report. This runs the runtime's own check, so a content
 * edit without a recertified report fails CI instead of breaking the
 * prescreen, assessment and plan pages in production.
 */
const content = join(__dirname, "..", "content");
const report = JSON.parse(readFileSync(join(content, RUNTIME_CERT_REPORT), "utf8")) as CertReportFile;

describe("shipped content matches the runtime cert report", () => {
  it("the full-mode report is green", () => {
    expect(report.mode).toBe("full");
    expect(report.pass).toBe(true);
  });

  for (const [name, file] of Object.entries(ARTIFACT_FILES)) {
    it(`${name} (${file}) loads through loadCertifiedArtifact`, async () => {
      const raw = readFileSync(join(content, file), "utf8");
      const parsed = await loadCertifiedArtifact<{ artifact: string }>(name, raw, report);
      expect(parsed.artifact).toBe(name);
    });
  }

  it("a one-byte edit is refused (the check is real)", async () => {
    const raw = readFileSync(join(content, ARTIFACT_FILES["prompts.deck"]), "utf8");
    await expect(loadCertifiedArtifact("prompts.deck", raw + " ", report)).rejects.toThrow(/hash mismatch/);
  });
});

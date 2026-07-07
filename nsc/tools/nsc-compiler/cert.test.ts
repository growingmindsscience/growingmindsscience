/**
 * Cert harness tests — spec §7.1 + PR3 milestone: "cert harness green on gold
 * set; banned-word lint proven with red-team fixtures."
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { lintBanned } from "./banned";
import { fleschKincaidGrade } from "./readability";
import {
  certifyAssessmentCopy,
  certifyCitations,
  certifyGamesCatalog,
} from "./cert";
import { loadCertifiedArtifact, sha256Hex } from "../../lib/artifacts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const fixture = (name: string) =>
  readFileSync(join(here, "fixtures", name), "utf8");

const goldGames = read("content/gold/games.catalog.v1-gold.json");
const goldCopy = read("content/gold/assessment.copy.v1-gold.json");
const citations = read("content/citations.v1.json");

describe("gold set certifies green (PR3 milestone)", () => {
  it("games catalog passes in gold mode", () => {
    const r = certifyGamesCatalog(goldGames, citations, "gold");
    expect(r.checks).toSatisfy(
      () => r.pass,
      JSON.stringify(r.checks, null, 2),
    );
    // coverage is explicitly skipped, not silently passed
    expect(r.checks.find((c) => c.name === "coverage-matrix")!.status).toBe(
      "skip",
    );
    // unverified citations surface as a warning, never silently
    expect(r.checks.find((c) => c.name === "evidence-tags")!.status).toBe(
      "warn",
    );
  });

  it("assessment copy passes in gold mode", () => {
    const r = certifyAssessmentCopy(goldCopy, "gold");
    expect(r.pass, JSON.stringify(r.checks, null, 2)).toBe(true);
  });

  it("citations table passes in gold mode with G1 skipped", () => {
    const r = certifyCitations(citations, "gold");
    expect(r.pass).toBe(true);
    expect(r.checks.find((c) => c.name === "g1-verified")!.status).toBe(
      "skip",
    );
  });

  it("full mode refuses unverified citations (G1 gate is mechanical)", () => {
    const games = certifyGamesCatalog(goldGames, citations, "full");
    expect(games.pass).toBe(false);
    const cites = certifyCitations(citations, "full");
    expect(cites.pass).toBe(false);
  });
});

describe("red-team fixtures (lint must catch every plant)", () => {
  it("catches every banned phrase in the banned fixture", () => {
    const raw = fixture("redteam-banned.json");
    const r = certifyGamesCatalog(raw, citations, "gold");
    expect(r.pass).toBe(false);
    const banned = r.checks.find((c) => c.name === "banned-language")!;
    expect(banned.status).toBe("fail");
    // every planted category fires
    const hits = lintBanned(JSON.parse(raw));
    const firing = new Set(hits.map((h) => h.pattern));
    for (const expected of [
      "behind",
      "by now",
      "should be able to",
      "struggl*",
      "red flag",
      "delay",
      "percentile",
      "at risk",
      "falling",
      "diagnos*",
    ]) {
      expect(firing, `expected pattern "${expected}" to fire`).toContain(
        expected,
      );
    }
  });

  it("catches a dangling evidence tag", () => {
    const r = certifyGamesCatalog(
      fixture("redteam-dangling-tag.json"),
      citations,
      "gold",
    );
    expect(r.pass).toBe(false);
    expect(
      r.checks.find((c) => c.name === "evidence-tags")!.details,
    ).toContain("dangling tag ev.fake.doesnotexist");
  });

  it("catches grad-school copy with the readability check", () => {
    const r = certifyAssessmentCopy(fixture("redteam-readability.json"), "gold");
    expect(r.pass).toBe(false);
    expect(r.checks.find((c) => c.name === "readability")!.status).toBe(
      "fail",
    );
  });

  it("catches schema violations (missing field, short script)", () => {
    const r = certifyGamesCatalog(
      fixture("redteam-schema.json"),
      citations,
      "gold",
    );
    expect(r.pass).toBe(false);
    expect(r.checks.find((c) => c.name === "json-schema")!.status).toBe(
      "fail",
    );
  });
});

describe("readability mechanics", () => {
  it("grades simple parent copy well under 8", () => {
    const r = fleschKincaidGrade([
      "Can you feed the bear one block? Put one in the bowl.",
      "Thank you! The bear is so happy.",
    ]);
    expect(r.grade).toBeLessThan(8);
  });
});

describe("certified-artifact loader (runtime hash gate)", () => {
  const reportFor = async (raw: string) => ({
    mode: "gold" as const,
    pass: true,
    reports: [
      {
        artifact: "games.catalog",
        sha256: await sha256Hex(raw),
        mode: "gold" as const,
        pass: true,
      },
    ],
  });

  it("loads an artifact whose hash matches its passing report", async () => {
    const report = await reportFor(goldGames);
    const loaded = await loadCertifiedArtifact<{ games: unknown[] }>(
      "games.catalog",
      goldGames,
      report,
    );
    expect(loaded.games).toHaveLength(2);
  });

  it("refuses a tampered artifact", async () => {
    const report = await reportFor(goldGames);
    const tampered = goldGames.replace("Snack Plate Match", "Tampered Title");
    await expect(
      loadCertifiedArtifact("games.catalog", tampered, report),
    ).rejects.toThrow(/hash mismatch/);
  });

  it("refuses an artifact with a red report", async () => {
    const report = await reportFor(goldGames);
    report.reports[0].pass = false;
    report.pass = false;
    await expect(
      loadCertifiedArtifact("games.catalog", goldGames, report),
    ).rejects.toThrow(/red/);
  });

  it("refuses an artifact with no report entry", async () => {
    const report = await reportFor(goldGames);
    await expect(
      loadCertifiedArtifact("assessment.copy", goldCopy, report),
    ).rejects.toThrow(/no cert report entry/);
  });
});

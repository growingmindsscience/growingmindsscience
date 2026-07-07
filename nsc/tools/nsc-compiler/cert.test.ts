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
    // G1 has now run: the real citation table is fully verified, so gold
    // mode reports a clean pass rather than the pending-G1 warning.
    expect(r.checks.find((c) => c.name === "evidence-tags")!.status).toBe(
      "pass",
    );
  });

  it("gold mode still WARNS (never silently passes) when a tag is unverified", () => {
    // Prove the pending-G1 signal survives by feeding a synthetic
    // unverified table for the tags the gold games reference.
    const unverified = JSON.stringify({
      artifact: "citations",
      version: "v1",
      citations: [
        {
          tag_id: "ev.numbertalk.levine2010",
          anchor: "x",
          claim_scope: "placeholder scope",
          verified: false,
          full_cite: null,
        },
        {
          tag_id: "ev.numbertalk.gunderson2011",
          anchor: "x",
          claim_scope: "placeholder scope",
          verified: false,
          full_cite: null,
        },
        {
          tag_id: "ev.knower.lecorre2007",
          anchor: "x",
          claim_scope: "placeholder scope",
          verified: false,
          full_cite: null,
        },
      ],
    });
    const r = certifyGamesCatalog(goldGames, unverified, "gold");
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

  it("full mode accepts the real citation table now that G1 has run", () => {
    // All rows in content/citations.v1.json were flipped verified:true by the
    // G1 human-verification pass (2026-07-07).
    expect(certifyCitations(citations, "full").pass).toBe(true);
  });

  it("full mode still refuses an unverified citation (G1 gate is mechanical)", () => {
    const table = JSON.parse(citations);
    // flip a tag a gold game actually cites (levine2010 → one-for-you-one-for-me)
    const row = table.citations.find(
      (c: { tag_id: string }) => c.tag_id === "ev.numbertalk.levine2010",
    );
    row.verified = false;
    const raw = JSON.stringify(table);
    expect(certifyCitations(raw, "full").pass).toBe(false);
    // the evidence-tags check specifically flags the unverified tag (overall
    // pass is confounded by the gold set's deliberate coverage shortfall)
    const games = certifyGamesCatalog(goldGames, raw, "full");
    const evidence = games.checks.find((c) => c.name === "evidence-tags")!;
    expect(evidence.status).toBe("fail");
    expect(evidence.details).toContain("not G1-verified");
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

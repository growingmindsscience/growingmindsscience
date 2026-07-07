/**
 * Cert CLI — `npm run cert:gold` / `npm run cert:full`.
 * Writes content/cert/cert.report.<mode>.json and exits non-zero on any red.
 * Runtime refuses to load any artifact whose hash lacks a matching passing
 * report (lib/artifacts.ts).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  certifyAssessmentCopy,
  certifyCitations,
  certifyGamesCatalog,
  certifyPromptsDeck,
  type CertMode,
  type CertReport,
} from "./cert";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mode: CertMode = process.argv.includes("--mode")
  ? (process.argv[process.argv.indexOf("--mode") + 1] as CertMode)
  : "gold";

if (mode !== "gold" && mode !== "full") {
  console.error(`unknown mode: ${mode}`);
  process.exit(2);
}

const files =
  mode === "gold"
    ? {
        games: join(root, "content/gold/games.catalog.v1-gold.json"),
        copy: join(root, "content/gold/assessment.copy.v1-gold.json"),
        citations: join(root, "content/citations.v1.json"),
      }
    : {
        games: join(root, "content/games.catalog.v1.json"),
        copy: join(root, "content/assessment.copy.v1.json"),
        citations: join(root, "content/citations.v1.json"),
        prompts: join(root, "content/prompts.deck.v1.json"),
      };

const gamesRaw = readFileSync(files.games, "utf8");
const copyRaw = readFileSync(files.copy, "utf8");
const citationsRaw = readFileSync(files.citations, "utf8");

const reports: CertReport[] = [
  certifyGamesCatalog(gamesRaw, citationsRaw, mode),
  certifyAssessmentCopy(copyRaw, mode),
  certifyCitations(citationsRaw, mode),
];

if (mode === "full") {
  const promptsRaw = readFileSync(
    join(root, "content/prompts.deck.v1.json"),
    "utf8",
  );
  reports.push(certifyPromptsDeck(promptsRaw));
}

const allPass = reports.every((r) => r.pass);
const out = { mode, pass: allPass, reports };

const outDir = join(root, "content/cert");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `cert.report.${mode}.json`);
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");

for (const r of reports) {
  console.log(`\n${r.artifact} (${r.sha256.slice(0, 12)}…): ${r.pass ? "PASS" : "FAIL"}`);
  for (const c of r.checks) {
    console.log(`  [${c.status.toUpperCase().padEnd(4)}] ${c.name}: ${c.details}`);
  }
}
console.log(`\ncert report → ${outPath}`);
process.exit(allPass ? 0 : 1);

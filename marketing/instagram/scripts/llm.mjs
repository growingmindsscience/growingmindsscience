// One structured call to Claude through the Claude Code CLI in print mode.
//
//   import { ask } from "./llm.mjs";
//   const { data, cost } = await ask({ system, prompt, schema, label: "plan" });
//
// The CLI is the transport so the drafter runs on whatever credential is to hand:
// Matthew's own login on his Mac, CLAUDE_CODE_OAUTH_TOKEN (from `claude setup-token`)
// or ANTHROPIC_API_KEY in GitHub Actions. Every call runs with no tools, no MCP
// servers, no settings files and no session on disk: text in, schema-checked JSON
// out. The model and effort come from automation.json unless the caller says
// otherwise; CLAUDE_BIN overrides the binary.

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BIN = process.env.CLAUDE_BIN || "claude";
const TIMEOUT_MS = 20 * 60000;

function run(argv, stdin) {
  return new Promise((resolve, reject) => {
    const p = spawn(BIN, argv, { stdio: ["pipe", "pipe", "pipe"], env: process.env });
    let out = "", err = "";
    const timer = setTimeout(() => { p.kill("SIGTERM"); reject(new Error(`claude timed out after ${TIMEOUT_MS / 60000} minutes`)); }, TIMEOUT_MS);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => { clearTimeout(timer); reject(e); });
    p.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && !out) return reject(new Error(`claude exited ${code}: ${err.slice(-400)}`));
      resolve(out);
    });
    p.stdin.end(stdin);
  });
}

export async function ask({ system, prompt, schema, model = "claude-opus-5-5", effort = "high", label = "call", retries = 1 }) {
  const dir = mkdtempSync(join(tmpdir(), "ig-llm-"));
  const sysFile = join(dir, "system.md");
  writeFileSync(sysFile, system);
  const argv = [
    "-p", "--model", model, "--effort", effort,
    "--tools", "", "--setting-sources", "", "--strict-mcp-config", "--no-session-persistence",
    "--output-format", "json", "--system-prompt-file", sysFile,
    "--json-schema", JSON.stringify(schema),
  ];
  try {
    for (let attempt = 0; ; attempt++) {
      const t0 = Date.now();
      try {
        const raw = await run(argv, prompt);
        const res = JSON.parse(raw);
        if (res.is_error || res.subtype !== "success") throw new Error(`${res.subtype || "error"}: ${String(res.result || "").slice(0, 300)}`);
        const data = res.structured_output ?? JSON.parse(res.result);
        console.log(`  claude ${label}: ${((Date.now() - t0) / 1000).toFixed(0)}s${res.total_cost_usd != null ? `, ~$${res.total_cost_usd.toFixed(3)}` : ""}`);
        return { data, cost: res.total_cost_usd || 0 };
      } catch (e) {
        if (attempt >= retries) throw new Error(`claude ${label} failed: ${e.message}`);
        console.warn(`  claude ${label}: ${e.message}; retrying`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

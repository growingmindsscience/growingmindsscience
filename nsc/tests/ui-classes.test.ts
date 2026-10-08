import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { buttonClasses } from "../components/ui";

const root = join(__dirname, "..");

/** The opening tag that starts at `start`: up to its first `>` outside
 *  braces and quotes (a `>` in `() => x` or in a string is not the end). */
function openingTag(src: string, start: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
    } else if (ch === ">" && depth === 0) {
      return src.slice(start, i + 1);
    }
  }
  return src.slice(start);
}

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return tsxFiles(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

describe("button variants (N10)", () => {
  it("the amber variant is ink text on an amber fill, with no competing colors", () => {
    const c = buttonClasses("amber").split(" ");
    expect(c).toContain("bg-amber");
    expect(c).toContain("text-ink-900");
    expect(c).not.toContain("text-white");
    expect(c).not.toContain("bg-teal");
  });

  it("every button is a 10px-radius rectangle, never a pill", () => {
    for (const variant of ["primary", "ghost", "amber"] as const) {
      for (const size of ["md", "sm"] as const) {
        const c = buttonClasses(variant, size).split(" ");
        expect(c).toContain("rounded-control");
        expect(c).not.toContain("rounded-full");
      }
    }
  });

  it("each border color comes from exactly one utility", () => {
    for (const variant of ["primary", "ghost", "amber"] as const) {
      const colors = buttonClasses(variant).split(" ").filter((k) => /^border-(?!\[)/.test(k));
      expect(colors).toHaveLength(1);
    }
  });

  it("each size sets exactly one padding and a 48px minimum height", () => {
    const md = buttonClasses("primary", "md").split(" ");
    const sm = buttonClasses("primary", "sm").split(" ");
    expect(md.filter((k) => /^px-/.test(k))).toEqual(["px-[1.4rem]"]);
    expect(sm.filter((k) => /^px-/.test(k))).toEqual(["px-4"]);
    expect(md).toContain("min-h-12");
    expect(sm).toContain("min-h-12");
  });

  // Tailwind orders utilities by stylesheet position, not attribute order, so
  // a color/size override in className silently loses. Keep them out.
  it("no Button/LinkButton passes a color or size override through className", () => {
    const CONFLICT = /(^|\s)(bg-|text-(white|ink|teal|sea|rung|surface|xs|sm|base|lg|xl)|px-|py-|p-\d|min-h-|h-\d)/;
    const offenders: string[] = [];
    for (const file of [...tsxFiles(join(root, "app")), ...tsxFiles(join(root, "components"))]) {
      const src = readFileSync(file, "utf8");
      const re = /<(Button|LinkButton|SubmitButton)\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const cls = /className="([^"]*)"/.exec(openingTag(src, m.index))?.[1];
        if (cls && CONFLICT.test(cls)) offenders.push(`${relative(root, file)}: ${cls}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

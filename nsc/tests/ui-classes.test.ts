import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { buttonClasses } from "../components/ui";

const root = join(__dirname, "..");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return tsxFiles(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

describe("button variants (N10)", () => {
  it("the inverse variant is dark text on a light pill, with no competing colors", () => {
    const c = buttonClasses("inverse").split(" ");
    expect(c).toContain("bg-white");
    expect(c).toContain("text-ink-deep");
    expect(c).not.toContain("text-white");
    expect(c).not.toContain("bg-teal");
  });

  it("each size sets exactly one padding and a 44px+ minimum height", () => {
    const md = buttonClasses("primary", "md").split(" ");
    const sm = buttonClasses("primary", "sm").split(" ");
    expect(md.filter((k) => /^px-/.test(k))).toEqual(["px-6"]);
    expect(sm.filter((k) => /^px-/.test(k))).toEqual(["px-4"]);
    expect(md).toContain("min-h-12");
    expect(sm).toContain("min-h-11");
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
        const end = src.indexOf(">\n", m.index);
        const tag = src.slice(m.index, end === -1 ? undefined : end);
        const cls = /className="([^"]*)"/.exec(tag)?.[1];
        if (cls && CONFLICT.test(cls)) offenders.push(`${relative(root, file)}: ${cls}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

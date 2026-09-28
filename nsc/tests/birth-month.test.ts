import { describe, expect, it } from "vitest";
import { birthMonthFromForm, birthYearOptions, parseBirthMonth } from "../lib/birth-month";

const TODAY = "2026-09-28";

describe("birth month input (N22)", () => {
  it("reads the month and year selects", () => {
    expect(parseBirthMonth({ month: "3", year: "2024" }, TODAY)).toEqual({ ok: true, value: "2024-03" });
    expect(parseBirthMonth({ month: "12", year: "2023" }, TODAY)).toEqual({ ok: true, value: "2023-12" });
  });

  it("still accepts a YYYY-MM value (older forms, browsers with a month picker)", () => {
    expect(parseBirthMonth({ combined: "2024-03" }, TODAY)).toEqual({ ok: true, value: "2024-03" });
  });

  it("allows this month and refuses future months", () => {
    expect(parseBirthMonth({ month: "9", year: "2026" }, TODAY)).toEqual({ ok: true, value: "2026-09" });
    expect(parseBirthMonth({ month: "10", year: "2026" }, TODAY)).toEqual({ ok: false, reason: "future" });
  });

  it("treats blanks and junk as missing", () => {
    for (const f of [{}, { month: "", year: "" }, { month: "13", year: "2024" }, { combined: "March 2024" }]) {
      expect(parseBirthMonth(f, TODAY)).toEqual({ ok: false, reason: "missing" });
    }
  });

  it("reads a submitted form", () => {
    const fd = new FormData();
    fd.set("birth_month_m", "7");
    fd.set("birth_month_y", "2023");
    expect(birthMonthFromForm(fd, TODAY)).toEqual({ ok: true, value: "2023-07" });
  });

  it("offers this year and the seven before it", () => {
    expect(birthYearOptions(TODAY)).toEqual([2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019]);
  });
});

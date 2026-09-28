import { describe, expect, it } from "vitest";
import { addDaysISO, isValidTimeZone, localDateISO, mondayOfISO } from "../lib/tz";
import { dayIndex, isoWeekKey, weekSeed, weekStartISO } from "../lib/isoweek";

// 2026-09-29T02:30Z is a Tuesday in UTC but still Monday evening in LA.
const EVENING_LA = new Date("2026-09-29T02:30:00Z");

describe("parent's calendar day (N21)", () => {
  it("validates IANA zones", () => {
    expect(isValidTimeZone("America/Los_Angeles")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone(42)).toBe(false);
  });

  it("uses the local date, not the UTC date", () => {
    expect(localDateISO(EVENING_LA, "UTC")).toBe("2026-09-29");
    expect(localDateISO(EVENING_LA, "America/Los_Angeles")).toBe("2026-09-28");
    expect(localDateISO(EVENING_LA, "garbage")).toBe("2026-09-29"); // falls back to UTC
  });

  it("today's prompt index follows the local weekday", () => {
    expect(dayIndex(EVENING_LA)).toBe(1); // Tuesday (UTC default)
    expect(dayIndex(EVENING_LA, "America/Los_Angeles")).toBe(0); // Monday
  });

  it("the week turns over at local Monday midnight", () => {
    // Sunday 2026-09-27 at 11pm in LA is Monday 06:00 UTC.
    const sundayNightLA = new Date("2026-09-28T06:00:00Z");
    expect(weekStartISO(sundayNightLA, "UTC")).toBe("2026-09-28");
    expect(weekStartISO(sundayNightLA, "America/Los_Angeles")).toBe("2026-09-21");
    expect(weekSeed("c1", sundayNightLA, "America/Los_Angeles")).toBe("c1:2026-W39");
    expect(weekSeed("c1", sundayNightLA)).toBe("c1:2026-W40");
  });

  it("date helpers", () => {
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysISO("2024-03-01", -1)).toBe("2024-02-29");
    expect(mondayOfISO("2026-10-04")).toBe("2026-09-28"); // Sunday → its Monday
    expect(mondayOfISO("2026-09-28")).toBe("2026-09-28");
    expect(isoWeekKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-W01");
  });
});

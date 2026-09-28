import { describe, expect, it, vi } from "vitest";
import {
  checkinEmail,
  chunk,
  claimSendRelease,
  escapeHtml,
  joinNames,
  latestCompletedByChild,
  mapLimit,
  weeklyEmail,
  type CompletedCheckin,
} from "../lib/engagement";
import { isRungReading, rungLabelFor } from "../lib/labels";

const links = { ctaUrl: "https://x.test/nsc/app", unsubUrl: "https://x.test/u?token=t" };
const KNOWER_WORDS = /knower|counts any set|just starting out|rung/i;

describe("cron plumbing (N12)", () => {
  it("chunks long id lists", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 100)).toEqual([]);
    expect(() => chunk([1], 0)).toThrow();
  });

  it("mapLimit keeps order and never exceeds the concurrency bound", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 2));
      inFlight--;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50, 60, 70]);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it("finds each child's latest completed check-in regardless of row order", () => {
    const row = (id: string, child: string, at: string | null): CompletedCheckin => ({
      id,
      child_id: child,
      owner_id: "o",
      placement: "L2",
      near_cp: false,
      completed_at: at,
      confidence: "high",
    });
    const latest = latestCompletedByChild([
      row("a1", "c1", "2026-06-01T00:00:00+00:00"),
      row("a2", "c1", "2026-08-01T00:00:00+00:00"),
      row("a3", "c1", null),
      row("b1", "c2", "2026-07-01T00:00:00+00:00"),
    ]);
    expect(latest.get("c1")?.id).toBe("a2");
    expect(latest.get("c2")?.id).toBe("b1");
  });
});

describe("claim, send, release (a failed send never burns a reminder)", () => {
  it("keeps the claim only when the send succeeds", async () => {
    const release = vi.fn(async () => {});
    expect(
      await claimSendRelease({ claim: async () => ({ id: 1 }), send: async () => ({ ok: true }), release }),
    ).toBe("sent");
    expect(release).not.toHaveBeenCalled();
  });

  it("releases the claim when the send fails or throws", async () => {
    const release = vi.fn(async () => {});
    expect(
      await claimSendRelease({ claim: async () => ({ id: 7 }), send: async () => ({ ok: false }), release }),
    ).toBe("failed");
    expect(release).toHaveBeenCalledWith(7);
    const throwing = vi.fn(async () => {});
    expect(
      await claimSendRelease({
        claim: async () => ({ id: 8 }),
        send: async () => {
          throw new Error("network");
        },
        release: throwing,
      }),
    ).toBe("failed");
    expect(throwing).toHaveBeenCalledWith(8);
  });

  it("does not send when another run already holds the key", async () => {
    const send = vi.fn(async () => ({ ok: true }));
    expect(await claimSendRelease({ claim: async () => "exists" as const, send, release: async () => {} })).toBe(
      "already",
    );
    expect(send).not.toHaveBeenCalled();
  });
});

describe("email copy (N13: Point and Seek is never named as a rung)", () => {
  const ps = { placement: "L1", near_cp: false, instrument: "point_and_seek" };
  const giveN = { placement: "L2", near_cp: false, instrument: "give_n" };

  it("labels only Give-N readings", () => {
    expect(rungLabelFor(ps)).toBeNull();
    expect(rungLabelFor(giveN)).toBe("two-knower");
    expect(rungLabelFor({ placement: "L4", near_cp: true })).toBe("four-knower, nearly there");
    expect(isRungReading(ps)).toBe(false);
    expect(isRungReading(giveN)).toBe(true);
  });

  it("weekly note names no rung for a Point and Seek child", () => {
    const mail = weeklyEmail([{ nickname: "Mia", rung: rungLabelFor(ps) }], links);
    expect(mail.text).not.toMatch(KNOWER_WORDS);
    expect(mail.text).toContain("Mia");
    const giveNMail = weeklyEmail([{ nickname: "Leo", rung: rungLabelFor(giveN) }], links);
    expect(giveNMail.text).toContain("the two-knower rung");
  });

  it("check-in reminder names no rung for a Point and Seek child", () => {
    const mail = checkinEmail({ nickname: "Mia" }, { completedAt: "2026-08-01T10:00:00Z", rung: null }, links);
    expect(mail.text).not.toMatch(KNOWER_WORDS);
    expect(mail.subject).toBe("Mia's next check-in is ready");
  });

  it("escapes parent-typed nicknames in HTML and uses no em dashes", () => {
    const mail = weeklyEmail(
      [
        { nickname: "<b>Mia</b>", rung: null },
        { nickname: "Leo", rung: "one-knower" },
      ],
      links,
    );
    expect(mail.html).not.toContain("<b>Mia</b>");
    expect(mail.html).toContain(escapeHtml("<b>Mia</b>"));
    for (const m of [mail, checkinEmail({ nickname: "Leo" }, { completedAt: "2026-08-01T10:00:00Z", rung: "one-knower" }, links)]) {
      expect(m.text).not.toContain("—");
    }
  });

  it("joins names naturally", () => {
    expect(joinNames(["Mia"])).toBe("Mia");
    expect(joinNames(["Mia", "Leo"])).toBe("Mia and Leo");
    expect(joinNames(["Mia", "Leo", "Ava"])).toBe("Mia, Leo and Ava");
  });
});

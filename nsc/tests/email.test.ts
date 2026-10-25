import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends from fromlittleonward.com and asks for replies at the Gmail inbox", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { sendEmail } = await import("@/lib/email.server");

    const result = await sendEmail({ to: "parent@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" });

    expect(result.ok).toBe(true);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.from).toBe("Tallykin <hello@fromlittleonward.com>");
    expect(body.reply_to).toBe("growingmindsscience@gmail.com");
    expect(body.to).toEqual(["parent@example.com"]);
  });
});

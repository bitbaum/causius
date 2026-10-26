import { afterEach, describe, expect, it, vi } from "vitest";
import { mailConfigured, sendAuthMail } from "./mail";
import { SITE } from "./site";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("account mail delivery contract", () => {
  it("uses the verified fleet sender when no app sender is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_fleet_test_synthetic");
    vi.stubEnv("RESEND_FROM", "");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ id: "synthetic" }));
    vi.stubGlobal("fetch", fetchMock);
    expect(mailConfigured()).toBe(true);
    const link =
      SITE.url +
      "/api/auth/reset-password/synthetic?redirectTo=%2Fde%2Fsign-in";
    await sendAuthMail("reset", "synthetic@example.ch", link);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.from).toBe("Causius <causius@fleetcrown.orangecat.ch>");
    expect(payload.text).toContain(link);
    expect(payload.subject).toBeTruthy();
  });
  it("does not deliver foreign recovery links or expose tokens in diagnostics", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    await sendAuthMail(
      "reset",
      "synthetic@example.ch",
      "https://attacker.example/reset?token=secret",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.stringify(errors.mock.calls)).not.toContain("secret");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
    await sendAuthMail(
      "reset",
      "synthetic@example.ch",
      SITE.url + "/reset?token=secret",
    );
    expect(JSON.stringify(warnings.mock.calls)).not.toContain("secret");
  });
});

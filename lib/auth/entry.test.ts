import { describe, it, expect } from "vitest";
import { accountDestination } from "./entry";

describe("account return routes", () => {
  it("localizes unprefixed paths once and preserves localized callback queries", () => {
    expect(accountDestination("de", "/account")).toBe("/de/account");
    expect(
      accountDestination("de", "/de/account?section=security#methods"),
    ).toBe("/de/account?section=security#methods");
    expect(accountDestination("fr", "/it/account")).toBe("/it/account");
  });
  it("rejects external destinations and sign-in loops", () => {
    const fallback = accountDestination("de");
    for (const next of [
      "https://attacker.example",
      "//attacker.example",
      "/\\attacker.example",
      "/sign-in",
      "/de/sign-in?next=/account",
      "/fr/sign-up",
    ]) {
      expect(accountDestination("de", next)).toBe(fallback);
    }
  });
});

import { describe, expect, it } from "vitest";
import { daysUntil, formatDate, parseCase } from "./case";
import { SAMPLE_CASE } from "./sample";

describe("parseCase", () => {
  it("round-trips an exported case unchanged", () => {
    const exported: unknown = JSON.parse(JSON.stringify(SAMPLE_CASE));
    expect(parseCase(exported)).toEqual(SAMPLE_CASE);
  });

  it("refuses anything without a title", () => {
    expect(parseCase(null)).toBeNull();
    expect(parseCase("a letter")).toBeNull();
    expect(parseCase({ summary: "no title" })).toBeNull();
    expect(parseCase({ title: "   " })).toBeNull();
  });

  it("fills what is missing instead of rendering undefined", () => {
    const c = parseCase({ title: "Tax office letter" });
    expect(c).toMatchObject({
      version: 1,
      title: "Tax office letter",
      jurisdiction: "Not stated",
      authority: "Not stated",
      summary: "",
      asks: [],
      texts: [],
      notes: [],
      recommendedTier: "assistant",
    });
    expect(c?.id).toMatch(/^c_/);
    expect(c?.deadline).toBeUndefined();
  });

  it("drops a deadline that is not a real ISO date", () => {
    for (const deadline of ["30.10.2026", "2026-13-45", "soon", 20261030, null]) {
      expect(parseCase({ title: "t", deadline })?.deadline).toBeUndefined();
    }
    expect(parseCase({ title: "t", deadline: "2026-10-30" })?.deadline).toBe("2026-10-30");
  });

  it("drops bad list members and keeps the good ones", () => {
    const c = parseCase({
      title: "t",
      asks: [{ text: "Send your passport", evidence: ["All pages", 7, ""] }, { text: "" }, "junk", null],
      texts: [{ lang: "de", text: "Guten Tag" }, { lang: "fr" }],
      notes: ["Keep a copy", 3, ""],
    });
    expect(c?.asks).toEqual([
      { id: "a1", text: "Send your passport", evidence: ["All pages"], done: false },
    ]);
    expect(c?.texts).toEqual([{ lang: "de", label: "de", text: "Guten Tag" }]);
    expect(c?.notes).toEqual(["Keep a copy"]);
  });

  it("does not let an unknown tier through", () => {
    expect(parseCase({ title: "t", recommendedTier: "notary" })?.recommendedTier).toBe("assistant");
    expect(parseCase({ title: "t", recommendedTier: "lawyer" })?.recommendedTier).toBe("lawyer");
  });

  it("cuts over-long text rather than refusing the case", () => {
    const c = parseCase({ title: "x".repeat(500), summary: "y".repeat(9000) });
    expect(c?.title).toHaveLength(200);
    expect(c?.summary).toHaveLength(3000);
  });
});

describe("dates", () => {
  it("counts whole days to a deadline, negative once passed", () => {
    expect(daysUntil("2026-10-30", "2026-10-10")).toBe(20);
    expect(daysUntil("2026-10-30", "2026-10-30")).toBe(0);
    expect(daysUntil("2026-10-30", "2026-11-02")).toBe(-3);
  });

  it("formats a date without shifting it across time zones", () => {
    expect(formatDate("2026-10-30")).toBe("30 October 2026");
    expect(formatDate("2026-01-01")).toBe("1 January 2026");
  });
});

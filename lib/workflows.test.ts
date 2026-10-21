import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import { MatterCore } from "./matters/store";
import { HELPER_AREAS } from "./professions";
import { WORKFLOWS } from "./workflows";

describe("workflows", () => {
  it("carry no law of their own: no deadlines, amounts or article numbers", () => {
    // A brief says what to find out; the rule is researched and cited each time.
    for (const w of WORKFLOWS) expect(w.brief, w.id).not.toMatch(/\d/);
  });

  it("each name an area a helper can list, so Find a helper can filter by it", () => {
    for (const w of WORKFLOWS) expect(HELPER_AREAS).toContain(w.area);
  });

  it("each have words for the person", () => {
    for (const w of WORKFLOWS) expect(en.Workflows.items).toHaveProperty(w.id);
  });

  it("are optional on a matter, and an unknown one is refused", () => {
    const base = { title: "T", summary: "", area: "", facts: [], hide: [] };
    expect(MatterCore.parse(base).workflow).toBeUndefined();
    expect(MatterCore.parse({ ...base, workflow: "rent-increase" }).workflow).toBe("rent-increase");
    expect(MatterCore.safeParse({ ...base, workflow: "made-up" }).success).toBe(false);
  });
});

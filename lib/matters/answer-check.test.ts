import { describe, expect, it } from "vitest";
import { answerProblems, repairPrompt } from "./answer-check";

const TOOLS = ["web_search", "read_page", "record_deadline", "update_matter", "draft_document"];
const none = { toolNames: TOOLS, sources: 0 };

describe("answer check", () => {
  it("catches the answer the live site gave: calls written out, law with no source", () => {
    // The shape observed on 2026-10-22, shortened.
    const text = [
      "**Legal basis**",
      "* **Obligationenrecht (OR) Art. 269a** – allows a rent increase …",
      "```commentary",
      'update_matter("Rent increase contest – Zürich", "Tenancy law", "CH-ZH")',
      'record_deadline("31 Oct 2026", "30 days from receipt")',
      "```",
    ].join("\n");
    expect(answerProblems(text, none)).toEqual(["narrated", "unsourced"]);
  });

  it("catches an answer that is only the note of a call", () => {
    expect(answerProblems("(called note_fact)", none)).toEqual(["narrated"]);
    expect(answerProblems("(called web_search, read_page)", none)).toEqual(["narrated"]);
  });

  it("catches a TOOL line left in the answer", () => {
    expect(answerProblems('TOOL: web_search\nARGS: {"query":"x"}', none)).toContain("narrated");
  });

  it("recognises how law is cited in Switzerland and Liechtenstein", () => {
    for (const s of ["Art. 270b OR", "Artikel 9 ZGB", "OR 270", "SR 220", "§ 12", "Art. 80 SchKG", "LGBl. 1926 Nr. 4", "art. 271 CO"])
      expect(answerProblems(`Under ${s} you may object.`, none), s).toEqual(["unsourced"]);
  });

  it("lets a sourced answer through, and one that states no law", () => {
    expect(answerProblems("Under Art. 270b OR you have 30 days [1].", { ...none, sources: 1 })).toEqual([]);
    expect(answerProblems("Send me the notice and the lease, and I will check the deadline.", none)).toEqual([]);
  });

  it("does not mistake prose about searching for a narrated call", () => {
    expect(answerProblems("I will search the web for the cantonal rules.", none)).toEqual([]);
  });

  it("catches a deadline given but not recorded", () => {
    const text = "## Your deadline: **4 November 2026**\nThe 30 days run from service.";
    expect(answerProblems(text, { ...none, deadlines: 0 })).toEqual(["unrecorded"]);
    expect(answerProblems("Die Frist läuft am 04.11.2026 ab.", { ...none, deadlines: 0 })).toEqual(["unrecorded"]);
    expect(answerProblems(text, { ...none, deadlines: 1 })).toEqual([]);
    // A date with no deadline in sight is not a deadline.
    expect(answerProblems("The assessment is dated 2 October 2026.", { ...none, deadlines: 0 })).toEqual([]);
  });

  it("asks for each problem, plainly", () => {
    const p = repairPrompt(["narrated", "unsourced"]);
    expect(p).toMatch(/Call the tools now/);
    expect(p).toMatch(/web_search/);
    expect(repairPrompt(["unrecorded"])).toMatch(/record_deadline/);
  });
});

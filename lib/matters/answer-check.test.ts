import { describe, expect, it } from "vitest";
import { answerLanguage, answerProblems, repairPrompt, withoutNarration } from "./answer-check";

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

  it("catches calls written as JSON, as one model did on 2026-10-22", () => {
    const text = '**Matter update**\n```json\n{ "action": "update_matter", "title": "Einsprache" }\n```';
    expect(answerProblems(text, none)).toEqual(["narrated"]);
    expect(answerProblems('I used "web_search" earlier.', none)).toEqual([]);
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

  it("strips the narration an answer still carries after its correction", () => {
    expect(withoutNarration("(called note_fact)", TOOLS)).toBe("");
    expect(withoutNarration('TOOL: note_fact\nARGS: {"fact":"x"}', TOOLS)).toBe("");
    const json = 'Your deadline is 4 November.\n```json\n{ "action": "update_matter" }\n```';
    expect(withoutNarration(json, TOOLS)).toBe("Your deadline is 4 November.");
    const code = 'Example:\n```json\n{ "amount": 1 }\n```';
    expect(withoutNarration(code, TOOLS)).toBe(code);
  });

  it("asks for each problem, plainly", () => {
    const p = repairPrompt(["narrated", "unsourced"]);
    expect(p).toMatch(/Call the tools now/);
    expect(p).toMatch(/web_search/);
    expect(repairPrompt(["unrecorded"])).toMatch(/record_deadline/);
  });
});

describe("the answer's language", () => {
  const de =
    "Ja, Sie können die Mietzinserhöhung anfechten. Die Frist beträgt 30 Tage, und sie beginnt mit dem Tag, an dem Ihnen die Mitteilung zugestellt worden ist. Die Schlichtungsbehörde ist für Ihre Wohnung zuständig, und die Anfechtung ist kostenlos. Sie müssen die Gründe nicht im Detail angeben, aber es ist hilfreich, wenn Sie die Unterlagen mit der Eingabe einreichen können.";
  const en =
    "Yes, you can contest the increase. The deadline is 30 days from the day the notice reached you, and the conciliation authority for your flat is the one to write to. It costs nothing to file, and you do not need to give detailed reasons, but it helps if you can attach the notice and your lease to the application you send.";

  it("tells a German answer from an English one, and leaves short or quoted text alone", () => {
    expect(answerLanguage(de)).toBe("de");
    expect(answerLanguage(en)).toBe("en");
    expect(answerLanguage("Ja, Sie können.")).toBeNull();
    expect(answerLanguage(`${en} «${de}»`)).toBe("en");
  });

  it("sends back an answer in another language than the reader's", () => {
    expect(answerProblems(de, { ...none, sources: 1, locale: "en" })).toEqual(["language"]);
    expect(answerProblems(de, { ...none, sources: 1, locale: "de" })).toEqual([]);
    expect(repairPrompt(["language"], { language: "English" })).toMatch(/Write it again in English/);
  });
});

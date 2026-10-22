import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseCase } from "../case";
import type { Db } from "../db";
import { MASTER, testDb } from "../test/db";
import { matterFromCase } from "./from-case";
import { loadMatter, readCore, openMatter } from "./store";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

const WORDS = { deadline: "Reply by", letter: "The letter", reply: "Draft reply" };

const quickCheck = parseCase({
  title: "Tax assessment 2025",
  jurisdiction: "Switzerland · Canton of Zürich",
  area: "Tax",
  summary: "The canton set taxable income at CHF 98'400.",
  deadline: "2026-11-04",
  deadlineQuote: "innert 30 Tagen nach Zustellung",
  consequence: "The assessment becomes final.",
  asks: [{ text: "Object in writing if you disagree.", evidence: [] }],
  texts: [{ lang: "de", text: "Sehr geehrte Frau Erika Muster, gegen diese Verfügung …" }],
  draftReply: { lang: "de", text: "Einsprache gegen die Veranlagung 2025" },
  redactions: [{ token: "[NAME-1]", value: "Erika Muster", kind: "NAME" }],
})!;

describe("a quick check brought into a matter", () => {
  it("carries the deadline with its quote, the letter, the draft, the place and the words to hide", async () => {
    const id = await matterFromCase(db, MASTER, { sub: "actor-a", accountName: "E. M.", data: quickCheck, words: WORDS });
    const view = (await loadMatter(db, MASTER, id, "actor-a", { raw: true }))!;
    expect(view.core.title).toBe("Tax assessment 2025");
    expect(view.jurisdiction).toBe("CH-ZH");
    expect(view.items).toMatchObject([{ kind: "deadline", due: "2026-11-04", label: "Reply by", quote: "innert 30 Tagen nach Zustellung" }]);
    expect(view.documents.map((d) => [d.name, d.origin])).toEqual(
      expect.arrayContaining([["The letter", "upload"], ["Draft reply", "draft"]]),
    );
    const core = await readCore(db, (await openMatter(db, MASTER, id, "actor-a"))!);
    expect(core.hide).toEqual(expect.arrayContaining(["Erika Muster", "E. M."]));
    expect(core.facts).toContain("The assessment becomes final.");
    expect(view.events.some((e) => e.kind === "step" && e.tool === "from_case")).toBe(true);
  });

  it("opens a matter from a check with no deadline and no place", async () => {
    const bare = parseCase({ title: "A letter", jurisdiction: "Germany · Freiburg" })!;
    const id = await matterFromCase(db, MASTER, { sub: "actor-b", data: bare, words: WORDS });
    const view = (await loadMatter(db, MASTER, id, "actor-b"))!;
    expect(view.jurisdiction).toBeNull();
    expect(view.items).toEqual([]);
    expect(view.documents).toEqual([]);
  });
});

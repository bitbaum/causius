import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { MASTER, testDb } from "../test/db";
import { cellsFrom, quoteOccurs, runReview, tableMarkdown } from "./review";
import { addDocument, createMatter, loadMatter, openMatter, readDocument } from "./store";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

const OWNER = "actor-owner";
const ENV = { GROQ_API_KEY: "shared-key" };
// Invented letters; Erika Muster is the placeholder name.
const NOTICE = "Sehr geehrte Frau Erika Muster\nDer Mietzins erhöht sich ab 1. Januar 2027 um CHF 120.\nSie können die Erhöhung innert 30 Tagen bei der Schlichtungsbehörde anfechten.";
const INVOICE = "Rechnung Nr. 4711\nBetrag: CHF 85.00, zahlbar innert 20 Tagen.";

function model(replies: string[]) {
  const seen: string[] = [];
  let n = 0;
  const impl: typeof fetch = async (_url, init) => {
    seen.push(String(init?.body ?? ""));
    return Response.json({ choices: [{ message: { role: "assistant", content: replies[Math.min(n++, replies.length - 1)] }, finish_reason: "stop" }] });
  };
  return { impl, seen };
}

describe("quotes", () => {
  it("count only when they are in the document, word for word", () => {
    expect(quoteOccurs("innert 30 Tagen bei der Schlichtungsbehörde", NOTICE)).toBe(true);
    // Spacing and quote marks are not held against it…
    expect(quoteOccurs("innert  30 Tagen\nbei der", NOTICE)).toBe(true);
    // …a paraphrase is.
    expect(quoteOccurs("within 30 days at the conciliation authority", NOTICE)).toBe(false);
    expect(quoteOccurs("", NOTICE)).toBe(false);
  });

  it("drop an answer whose quote is invented, and keep the order of the questions", () => {
    const reply = JSON.stringify({
      answers: [
        { answer: "30 days", quote: "innert 30 Tagen" },
        { answer: "The landlord", quote: "signed by the landlord" },
      ],
    });
    expect(cellsFrom(`Here you go: ${reply}`, 3, NOTICE)).toEqual([
      { answer: "30 days", quote: "innert 30 Tagen" },
      { answer: "" },
      { answer: "" },
    ]);
    expect(cellsFrom("not json", 2, NOTICE)).toEqual([{ answer: "" }, { answer: "" }]);
  });

  it("write a table a person can read and the agent can cite", () => {
    const md = tableMarkdown(
      { questions: ["By when?"], rows: [{ documentId: "d", name: "Notice | 1", cells: [{ answer: "30 days", quote: "innert 30 Tagen" }] }] },
      "not found",
    );
    expect(md).toContain("| Notice \\| 1 | 30 days — «innert 30 Tagen» |");
  });
});

describe("a review", () => {
  it("asks every document, never shows the model the name, and keeps the table in the matter", async () => {
    const id = await createMatter(db, MASTER, {
      ownerSub: OWNER,
      core: { title: "Rent", summary: "", area: "", facts: [], hide: ["Erika Muster"] },
    });
    const m = (await openMatter(db, MASTER, id, OWNER))!;
    await addDocument(db, m, { name: "Notice.txt", mime: "text/plain", origin: "upload", text: NOTICE, bySub: OWNER });
    await addDocument(db, m, { name: "Invoice.txt", mime: "text/plain", origin: "upload", text: INVOICE, bySub: OWNER });

    const fake = model([
      JSON.stringify({ answers: [{ answer: "30 days, to [NAME-1]", quote: "innert 30 Tagen" }, { answer: "CHF 120", quote: "um CHF 120" }] }),
      JSON.stringify({ answers: [{ answer: "20 days", quote: "zahlbar innert 20 Tagen" }, { answer: "CHF 85", quote: "a made-up line" }] }),
    ]);
    const out = await runReview({
      db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: fake.impl,
      questions: ["By when must I act?", "What amount?"], language: "English", notFound: "not found", title: "Review",
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.table.rows.map((r) => r.cells.map((c) => c.answer))).toEqual([
      ["30 days, to Erika Muster", "CHF 120"],
      ["20 days", ""], // the invented quote is dropped
    ]);
    expect(fake.seen.join("\n")).not.toMatch(/Erika|Muster/);

    const view = (await loadMatter(db, MASTER, id, OWNER))!;
    const saved = view.documents.find((d) => d.id === out.table.documentId)!;
    expect(saved.origin).toBe("draft");
    expect((await readDocument(db, m, saved.id))!.text).toContain("«innert 30 Tagen»");
    expect(view.events.some((e) => e.kind === "step" && e.tool === "review")).toBe(true);
  });

  it("refuses a matter without documents of the person's own, and a stranger", async () => {
    const id = await createMatter(db, MASTER, { ownerSub: OWNER, core: { title: "Empty", summary: "", area: "", facts: [], hide: [] } });
    const base = { db, master: MASTER, matterId: id, env: ENV, questions: ["What?"], language: "English", notFound: "-", title: "R" };
    expect(await runReview({ ...base, sub: OWNER })).toEqual({ ok: false, error: "no_documents" });
    expect(await runReview({ ...base, sub: "stranger" })).toEqual({ ok: false, error: "not_found" });
  });
});

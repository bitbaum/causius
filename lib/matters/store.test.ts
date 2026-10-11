import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { matters, events, documents, items, participants } from "../db/schema";
import { MASTER, testDb } from "../test/db";
import {
  addDocument,
  addItem,
  appendMessage,
  createMatter,
  decideApproval,
  deleteMatter,
  listMatters,
  loadMatter,
  NotAllowed,
  openMatter,
  readDocument,
  requestApproval,
  updateCore,
} from "./store";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

const ALICE = "actor-alice";
const MALLORY = "actor-mallory";

async function newMatter(owner = ALICE) {
  return createMatter(db, MASTER, {
    ownerSub: owner,
    core: { title: "Erika Muster tax appeal", summary: "", area: "Tax", facts: [], hide: ["Erika Muster"] },
    jurisdiction: "CH-ZH",
  });
}

describe("access", () => {
  it("lets the owner in and keeps everyone else out", async () => {
    const id = await newMatter();
    expect(await openMatter(db, MASTER, id, ALICE)).toMatchObject({ id, role: "owner" });
    expect(await openMatter(db, MASTER, id, MALLORY)).toBeNull();
    expect(await loadMatter(db, MASTER, id, MALLORY)).toBeNull();
    expect((await listMatters(db, MASTER, MALLORY)).map((m) => m.id)).not.toContain(id);
  });

  it("refuses ids that are not uuids instead of querying with them", async () => {
    expect(await openMatter(db, MASTER, "' or 1=1 --", ALICE)).toBeNull();
  });

  it("lets only the owner decide an approval or delete the matter", async () => {
    const id = await newMatter();
    const m = (await openMatter(db, MASTER, id, ALICE))!;
    const approval = await requestApproval(db, m, { action: "send", summary: "Send the objection" });
    const asObserver = { ...m, role: "observer" as const };
    await expect(decideApproval(db, asObserver, approval, "approved", MALLORY)).rejects.toThrow(NotAllowed);
    await expect(deleteMatter(db, asObserver)).rejects.toThrow(NotAllowed);
    expect(await decideApproval(db, m, approval, "approved", ALICE)).toBe(true);
    // A decision is final.
    expect(await decideApproval(db, m, approval, "rejected", ALICE)).toBe(false);
  });
});

describe("encryption at rest", () => {
  it("stores no readable title, message, document or deadline", async () => {
    const id = await newMatter();
    const m = (await openMatter(db, MASTER, id, ALICE))!;
    await appendMessage(db, m, { actor: ALICE, role: "user", text: "My neighbour Hans Beispiel built a wall" });
    await addDocument(db, m, { name: "Einsprache.md", mime: "text/markdown", origin: "draft", text: "Sehr geehrte Damen und Herren", bySub: "agent" });
    await addItem(db, m, { kind: "deadline", due: "2026-11-02", label: "Objection due", quote: "innert 30 Tagen" });
    const raw = JSON.stringify([
      await db.select().from(matters),
      await db.select().from(events),
      await db.select().from(documents),
      await db.select().from(items),
      await db.select().from(participants),
    ]);
    for (const secret of ["Erika", "Muster", "tax appeal", "Hans Beispiel", "Einsprache", "Sehr geehrte", "innert", "Objection due"]) {
      expect(raw).not.toContain(secret);
    }
  });

  it("cannot be read with another master key", async () => {
    const id = await newMatter();
    await expect(openMatter(db, Buffer.alloc(32, 9), id, ALICE)).rejects.toThrow();
  });
});

describe("a matter's life", () => {
  it("collects messages, deadlines, documents and approvals, and lists what needs attention", async () => {
    const id = await newMatter();
    const m = (await openMatter(db, MASTER, id, ALICE))!;
    await appendMessage(db, m, { actor: ALICE, role: "user", text: "I received a tax assessment" });
    await appendMessage(db, m, { actor: "agent", role: "assistant", text: "You can object within 30 days [1].", sources: [{ id: "1", title: "StG ZH §140", url: "https://example.org/stg" }] });
    await addItem(db, m, { kind: "deadline", due: "2026-11-02", label: "Objection due" });
    await addItem(db, m, { kind: "task", due: null, label: "Find the assessment" });
    const doc = await addDocument(db, m, { name: "Objection", mime: "text/markdown", origin: "draft", text: "# Objection", bySub: "agent" });
    await requestApproval(db, m, { action: "send", summary: "Send the objection", documentId: doc });
    await updateCore(db, m, (c) => ({ ...c, facts: [...c.facts, "Assessment dated 2026-10-03"] }), "CH-ZH");

    const view = (await loadMatter(db, MASTER, id, ALICE))!;
    expect(view.core.title).toBe("Erika Muster tax appeal");
    expect(view.core.facts).toEqual(["Assessment dated 2026-10-03"]);
    expect(view.events.map((e) => e.kind)).toEqual(["message", "message"]);
    expect(view.events[1]).toMatchObject({ role: "assistant", sources: [{ id: "1" }] });
    expect(view.items.map((i) => i.label)).toEqual(["Objection due", "Find the assessment"]);
    expect(view.approvals[0]).toMatchObject({ action: "send", status: "pending", documentId: doc });
    expect((await readDocument(db, m, doc))?.text).toBe("# Objection");

    const listed = (await listMatters(db, MASTER, ALICE)).find((x) => x.id === id)!;
    expect(listed).toMatchObject({
      title: "Erika Muster tax appeal",
      jurisdiction: "CH-ZH",
      nextDue: { date: "2026-11-02", label: "Objection due" },
      pendingApprovals: 1,
    });
  });

  it("deletes everything with the matter", async () => {
    const id = await newMatter();
    const m = (await openMatter(db, MASTER, id, ALICE))!;
    await appendMessage(db, m, { actor: ALICE, role: "user", text: "x" });
    await deleteMatter(db, m);
    expect(await openMatter(db, MASTER, id, ALICE)).toBeNull();
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { MASTER, testDb } from "../test/db";
import { runTurn } from "./agent";
import { createMatter, loadMatter } from "./store";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

const OWNER = "actor-owner";
const ENV = { GROQ_API_KEY: "shared-key" };

/** A model that answers with the scripted replies in order, recording what it was sent. */
function scriptedModel(replies: Array<{ text?: string; tools?: Array<[string, unknown]> }>) {
  const seen: string[] = [];
  let n = 0;
  const impl: typeof fetch = async (_url, init) => {
    seen.push(String(init?.body ?? ""));
    const r = replies[Math.min(n++, replies.length - 1)]!;
    return Response.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: r.text ?? "",
            tool_calls: r.tools?.map(([name, args], i) => ({
              id: `call_${n}_${i}`,
              type: "function",
              function: { name, arguments: JSON.stringify(args) },
            })),
          },
          finish_reason: r.tools ? "tool_calls" : "stop",
        },
      ],
    });
  };
  return { impl, seen };
}

async function matter() {
  return createMatter(db, MASTER, {
    ownerSub: OWNER,
    core: { title: "New matter", summary: "", area: "", facts: [], hide: ["Erika Muster"] },
  });
}

describe("a turn", () => {
  it("works the matter with tools, and the model never sees who it is about", async () => {
    const id = await matter();
    const model = scriptedModel([
      {
        tools: [
          ["update_matter", { title: "Tax objection for [NAME-1]", area: "Tax law", jurisdiction: "ch-zh" }],
          ["record_deadline", { date: "2026-11-02", label: "Objection due", quote: "innert 30 Tagen" }],
          ["draft_document", { title: "Einsprache", body: "Sehr geehrte Damen und Herren\n\n[NAME-1]" }],
          ["request_approval", { action: "send", summary: "Send the objection by registered post" }],
        ],
      },
      { text: "I drafted your objection, [NAME-1]. It is due on 2 November." },
    ]);
    const outcome = await runTurn({
      db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl,
      text: "I am Erika Muster. The Steueramt Zürich sent an assessment on 3 October; I want to object.",
    });
    expect(outcome).toMatchObject({ ok: true });

    // Nothing that identifies the person was sent to the model.
    expect(model.seen.join("\n")).not.toContain("Erika");
    expect(model.seen.join("\n")).not.toContain("Muster");
    expect(model.seen[0]).toContain("[NAME-");

    const view = (await loadMatter(db, MASTER, id, OWNER))!;
    // The real name is back wherever the model used a placeholder.
    expect(view.core.title).toBe("Tax objection for Erika Muster");
    expect(view.jurisdiction).toBe("CH-ZH");
    expect(view.items).toMatchObject([{ kind: "deadline", due: "2026-11-02", label: "Objection due" }]);
    expect(view.documents).toMatchObject([{ name: "Einsprache", origin: "draft" }]);
    expect(view.approvals).toMatchObject([{ action: "send", status: "pending" }]);
    const messages = view.events.filter((e) => e.kind === "message");
    expect(messages.at(-1)).toMatchObject({ role: "assistant", text: "I drafted your objection, Erika Muster. It is due on 2 November." });
    expect(view.events.filter((e) => e.kind === "step").map((e) => e.kind === "step" && e.tool)).toEqual([
      "update_matter", "record_deadline", "draft_document", "request_approval",
    ]);
  });

  it("tells a bad tool call what was wrong instead of acting on it", async () => {
    const id = await matter();
    const model = scriptedModel([
      { tools: [["record_deadline", { date: "next Tuesday", label: "x" }]] },
      { text: "Done." },
    ]);
    await runTurn({ db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl, text: "When is it due?" });
    expect(model.seen[1]).toContain("invalid arguments");
    expect((await loadMatter(db, MASTER, id, OWNER))!.items).toEqual([]);
  });

  it("cites only the sources it found, by number", async () => {
    const id = await matter();
    const model = scriptedModel([
      { tools: [["web_search", { query: "Einsprache Steuerveranlagung Zürich Frist" }]] },
      { text: "The deadline is 30 days [1]." },
    ]);
    await runTurn({
      db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl, text: "How long do I have?",
      search: async (query) => ({
        status: "found", query, provider: "test", attempts: [],
        results: [{ title: "StG ZH § 140", url: "https://www.zh.ch/stg", snippet: "innert 30 Tagen" }],
      }) as never,
    });
    const last = (await loadMatter(db, MASTER, id, OWNER))!.events.at(-1)!;
    expect(last).toMatchObject({ kind: "message", sources: [{ id: "1", url: "https://www.zh.ch/stg" }] });
  });

  it("never sends a hidden detail to a search engine, even when the model writes its placeholder", async () => {
    const id = await matter();
    const model = scriptedModel([
      { tools: [["web_search", { query: "[NAME-1] Steuerveranlagung Einsprache" }]] },
      { text: "Done." },
    ]);
    const queries: string[] = [];
    await runTurn({
      db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl,
      text: "I am Erika Muster and I want to object to my tax assessment.",
      search: async (query) => {
        queries.push(query);
        return { status: "found", query, provider: "test", attempts: [], results: [] } as never;
      },
    });
    expect(queries).toHaveLength(1);
    expect(queries[0]).not.toMatch(/Erika|Muster/);
  });

  it("checks domain names with the registries and reports what they said", async () => {
    const id = await matter();
    const model = scriptedModel([
      { tools: [["check_domain", { names: ["causius.com", "causius.ch"] }]] },
      { text: "causius.ch is not registered." },
    ]);
    const asked: string[][] = [];
    await runTurn({
      db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl, text: "Is the name free?",
      domains: async (names) => {
        asked.push(names);
        return [
          { name: "causius.com", status: "registered", registry: "rdap.verisign.com" },
          { name: "causius.ch", status: "not_registered", registry: "rdap.nic.ch" },
        ];
      },
    });
    expect(asked).toEqual([["causius.com", "causius.ch"]]);
    expect(model.seen[1]).toContain("causius.com: registered (per rdap.verisign.com)");
    expect(model.seen[1]).toContain("causius.ch: not registered");
    const steps = (await loadMatter(db, MASTER, id, OWNER))!.events.filter((e) => e.kind === "step");
    expect(steps.map((e) => e.kind === "step" && e.tool)).toContain("check_domain");
  });

  it("refuses strangers and says when no model is configured", async () => {
    const id = await matter();
    const model = scriptedModel([{ text: "x" }]);
    expect(await runTurn({ db, master: MASTER, matterId: id, sub: "actor-stranger", env: ENV, fetchImpl: model.impl, text: "hi" }))
      .toEqual({ ok: false, error: "not_found" });
    expect(await runTurn({ db, master: MASTER, matterId: id, sub: OWNER, env: {}, fetchImpl: model.impl, text: "hi" }))
      .toEqual({ ok: false, error: "not_configured" });
    expect(model.seen).toEqual([]);
  });
});

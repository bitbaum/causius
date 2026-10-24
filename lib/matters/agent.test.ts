import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { MASTER, testDb } from "../test/db";
import { REPLIES_INSTRUCTION, RICH_ANSWERS_INSTRUCTION } from "@bitbaum/chatkit";
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

describe("one-tap replies", () => {
  it("asks the model for them in the system prompt", async () => {
    const id = await matter();
    const model = scriptedModel([{ text: "Hello." }]);
    await runTurn({ db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl, text: "Hi" });
    const sent = JSON.parse(model.seen[0]!) as { messages: Array<{ role: string; content: string }> };
    const system = sent.messages.find((x) => x.role === "system")!.content;
    expect(system).toContain(REPLIES_INSTRUCTION);
    expect(system).toContain(RICH_ANSWERS_INSTRUCTION);
    // The rich-answer and replies instructions sit with ours, never in the user turns.
    expect(sent.messages.filter((x) => x.role !== "system").map((x) => x.content).join("\n")).not.toContain("## Suggested replies");
  });

  it("keeps the replies beside the answer and the block out of the stored text", async () => {
    const id = await matter();
    const model = scriptedModel([
      {
        text: 'You have 30 days to object, [NAME-1].\n\n```quick_replies\n["Draft the objection", "Which rule says 30 days?", "Not now"]\n```',
      },
    ]);
    await runTurn({
      db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl,
      text: "I am Erika Muster. How long do I have to object?",
    });
    const last = (await loadMatter(db, MASTER, id, OWNER))!.events.at(-1)!;
    expect(last).toMatchObject({
      kind: "message",
      role: "assistant",
      text: "You have 30 days to object, Erika Muster.",
      replies: ["Draft the objection", "Which rule says 30 days?", "Not now"],
    });
    expect((last as { text: string }).text).not.toContain("quick_replies");

    // The next turn's history carries the words only, never the block.
    const next = scriptedModel([{ text: "Done." }]);
    await runTurn({ db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: next.impl, text: "Draft the objection" });
    const sent = JSON.parse(next.seen[0]!) as { messages: Array<{ role: string; content: string }> };
    const history = sent.messages.filter((x) => x.role !== "system").map((x) => x.content);
    expect(history).toContain("You have 30 days to object, [NAME-1].");
    expect(history.join("\n")).not.toContain("quick_replies");
  });

  it("stores no replies when the answer offers none", async () => {
    const id = await matter();
    const model = scriptedModel([{ text: "Goodbye, and good luck." }]);
    await runTurn({ db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl, text: "Thanks, that is all." });
    const last = (await loadMatter(db, MASTER, id, OWNER))!.events.at(-1)!;
    expect(last).toMatchObject({ kind: "message", text: "Goodbye, and good luck." });
    expect((last as { replies?: string[] }).replies).toBeUndefined();
  });
});

describe("the answer check", () => {
  it("sends back a deadline that was not recorded, and the trace shows it", async () => {
    const id = await matter();
    const model = scriptedModel([
      { text: "Your deadline is **4 November 2026**." },
      { tools: [["record_deadline", { date: "2026-11-04", label: "Objection due", quote: "innert 30 Tagen" }]] },
      { text: "Recorded: your deadline is 4 November 2026." },
    ]);
    const rounds: Array<{ calls: string[]; problems: string[] }> = [];
    const outcome = await runTurn({
      db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl,
      onRound: (r) => rounds.push({ calls: r.calls, problems: r.problems }),
      text: "When must I object?",
    });
    expect(outcome).toMatchObject({ ok: true });
    expect(rounds).toEqual([
      { calls: [], problems: ["unrecorded"] },
      { calls: ["record_deadline"], problems: [] },
      { calls: [], problems: [] },
    ]);
    expect(model.seen[1]).toContain("Call record_deadline now");
    const view = (await loadMatter(db, MASTER, id, OWNER))!;
    expect(view.items.some((i) => i.kind === "deadline" && i.due === "2026-11-04")).toBe(true);
  });

  it("withdraws search when it is down; with Fedlex down too, the answer is stored unverified", async () => {
    const id = await matter();
    const model = scriptedModel([
      { tools: [["web_search", { query: "Art. 132 DBG Einsprachefrist" }]] },
      { text: "Under Art. 132 DBG you have 30 days." },
      { tools: [["read_law", { act: "DBG", article: "132" }]] },
      { text: "Under Art. 132 DBG you have 30 days." },
    ]);
    const outcome = await runTurn({
      db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl,
      search: async (query) => ({ status: "could_not_look", query, attempts: [] }),
      readLaw: async ({ act }) => ({ cite: `${act} (SR 642.11)`, collection: "Fedlex", result: { ok: false, reason: "unreachable" } }),
      text: "How long do I have?",
    });
    expect(outcome).toMatchObject({ ok: true });
    expect(model.seen).toHaveLength(4);
    expect(model.seen[0]).toContain('"name":"web_search"');
    expect(model.seen[1]).not.toContain('"name":"web_search"');
    expect(model.seen[1]).toContain("Search is not available for the rest of this turn");
    expect(model.seen[2]).toContain("read_law for a Swiss federal, cantonal or Liechtenstein act");
    expect(model.seen[3]).toContain("Fedlex could not be reached");
    const view = (await loadMatter(db, MASTER, id, OWNER))!;
    expect(view.events.some((e) => e.kind === "step" && e.tool === "unverified")).toBe(true);
  });
});

describe("reading the law", () => {
  it("reads an article from Fedlex when search is down, and the answer stands sourced", async () => {
    const id = await matter();
    const model = scriptedModel([
      { text: "Under Art. 270b OR you have 30 days." },
      { tools: [["read_law", { act: "OR", article: "270b" }]] },
      { text: "Under Art. 270b OR you have 30 days [1]." },
    ]);
    const outcome = await runTurn({
      db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl,
      search: async (query) => ({ status: "could_not_look", query, attempts: [] }),
      readLaw: async ({ act, provision }) => ({
        cite: `${act} (SR 220)`,
        collection: "Fedlex",
        result: {
          ok: true,
          article: {
            heading: `Art. ${provision}`,
            text: "1 Der Mieter kann eine Mietzinserhöhung innert 30 Tagen … anfechten.",
            url: `https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_270_b`,
            inForceSince: "2026-10-01",
          },
        },
      }),
      text: "Can I contest my rent increase?",
    });
    expect(outcome).toMatchObject({ ok: true });
    expect(model.seen[1]).toContain("read_law for a Swiss federal, cantonal or Liechtenstein act");
    expect(model.seen[2]).toContain("official text from Fedlex, in force since 2026-10-01");
    const view = (await loadMatter(db, MASTER, id, OWNER))!;
    const answer = view.events.filter((e) => e.kind === "message" && e.role === "assistant").at(-1);
    expect(answer && answer.kind === "message" ? answer.sources : []).toEqual([
      { id: "1", title: "Art. 270b OR (SR 220)", url: "https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_270_b" },
    ]);
    expect(view.events.some((e) => e.kind === "step" && e.tool === "unverified")).toBe(false);
  });
});

describe("finding the law by what it says", () => {
  it("searches Solon for the places named, and the answer cites what it found", async () => {
    const id = await matter();
    const asked: { terms: readonly string[]; authorities: readonly string[] }[] = [];
    const model = scriptedModel([
      { tools: [["search_law", { terms: ["Fuchs", "Wildtier", "Bewilligung"], places: ["GR", "LU"] }]] },
      { text: "Keeping wild animals needs a permit [1]." },
    ]);
    const outcome = await runTurn({
      db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl,
      searchSolon: async (input) => {
        asked.push(input);
        return [
          {
            actId: "11111111-1111-1111-1111-111111111111",
            authority: "gr",
            title: "Jagdgesetz",
            systematicNumber: "740.000",
            path: "art_12",
            heading: "Art. 12 Halten von Wildtieren",
            text: "Wer Wildtiere hält, braucht eine Bewilligung.",
            dateBasis: "publisher",
            inForceFrom: "2020-01-01",
            sourceUrl: null,
            contentSha256: "a".repeat(64),
          },
        ];
      },
      text: "Is it legal to keep a fox in Graubünden?",
    });
    expect(outcome).toMatchObject({ ok: true });
    expect(asked).toEqual([{ terms: ["Fuchs", "Wildtier", "Bewilligung"], authorities: ["ch", "gr", "lu"] }]);
    expect(model.seen[1]).toContain("Wer Wildtiere hält, braucht eine Bewilligung.");
    const view = (await loadMatter(db, MASTER, id, OWNER))!;
    const answer = view.events.filter((e) => e.kind === "message" && e.role === "assistant").at(-1);
    expect(answer && answer.kind === "message" ? answer.sources : []).toEqual([
      {
        id: "1",
        title: "Art. 12 Halten von Wildtieren, Jagdgesetz (GR)",
        url: "https://solon.orangecat.ch/law/11111111-1111-1111-1111-111111111111#art_12",
      },
    ]);
  });

  it("says so when Solon cannot be reached, instead of leaving the model to guess", async () => {
    const id = await matter();
    const model = scriptedModel([
      { tools: [["search_law", { terms: ["Fuchs"] }]] },
      { text: "I could not look this up." },
    ]);
    await runTurn({
      db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl,
      searchSolon: async () => null,
      text: "Fox?",
    });
    expect(model.seen[1]).toContain("Do not state the law from memory");
  });
});

describe("a runaway reply", () => {
  it("runs at most 8 calls of one reply, and a repeated call once", async () => {
    const id = await matter();
    let reads = 0;
    const model = scriptedModel([
      { tools: Array.from({ length: 30 }, () => ["read_law", { act: "OR", article: "270b" }] as [string, unknown]) },
      { text: "Done [1]." },
    ]);
    await runTurn({
      db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl,
      readLaw: async () => {
        reads++;
        return { cite: "OR (SR 220)", collection: "Fedlex", result: { ok: true, article: { heading: "Art. 270b", text: "x", url: "https://www.fedlex.admin.ch/x", inForceSince: "2026-10-01" } } };
      },
      text: "Rent?",
    });
    expect(reads).toBe(1);
    expect(model.seen[1]).toContain("at most 8 tool calls are run from one reply");
    expect(model.seen[1]).toContain("the same call was already made in this reply");
  });
});

describe("an answer lost to its correction", () => {
  it("keeps the turn's real answer when the last reply is only a call note", async () => {
    const id = await matter();
    const model = scriptedModel([
      { text: "Your objection is due 4 November 2026. update_matter(title)" },
      { text: "(called add_task)" },
      { text: "(called add_task)" },
    ]);
    await runTurn({ db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl, text: "When?" });
    const view = (await loadMatter(db, MASTER, id, OWNER))!;
    const answer = view.events.filter((e) => e.kind === "message" && e.role === "assistant").at(-1);
    expect(answer && answer.kind === "message" ? answer.text : "").toContain("Your objection is due 4 November 2026");
  });
});

describe("a turn that would end with nothing", () => {
  it("gets one more round, without tools, to answer in words", async () => {
    const id = await matter();
    const model = scriptedModel([
      ...Array.from({ length: 6 }, () => ({ tools: [["note_fact", { fact: "x" }]] as [string, unknown][] })),
      { text: "(called note_fact)" },
      { text: "Your deadline is recorded: 4 November 2026." },
    ]);
    await runTurn({ db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl, text: "When?" });
    const view = (await loadMatter(db, MASTER, id, OWNER))!;
    const answer = view.events.filter((e) => e.kind === "message" && e.role === "assistant").at(-1);
    expect(answer && answer.kind === "message" ? answer.text : "").toContain("4 November 2026");
    expect(model.seen.at(-1)).toContain("Answer the person now, without calling more tools.");
    expect(model.seen.at(-1)).not.toContain('"tools"');
  });
});

describe("a last round answered with a TOOL line", () => {
  it("gets one rescue round past the limit, and the answer stands", async () => {
    const id = await matter();
    const model = scriptedModel([
      ...Array.from({ length: 7 }, () => ({ tools: [["note_fact", { fact: "x" }]] as [string, unknown][] })),
      { text: 'TOOL: read_law\nARGS: {"act":"StG","article":"140","canton":"ZH"}' },
      { text: "You have until 4 November 2026 to object." },
    ]);
    await runTurn({ db, master: MASTER, matterId: id, sub: OWNER, env: ENV, fetchImpl: model.impl, text: "When?" });
    const view = (await loadMatter(db, MASTER, id, OWNER))!;
    const answer = view.events.filter((e) => e.kind === "message" && e.role === "assistant").at(-1);
    expect(answer && answer.kind === "message" ? answer.text : "").toContain("4 November 2026");
    expect(model.seen).toHaveLength(9);
    expect(model.seen.at(-1)).toContain("Tools are not available any more");
  });
});

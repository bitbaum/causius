import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { freeAvailability } from "../lib/analyze";
import type { Db } from "../lib/db";
import { runTurn } from "../lib/matters/agent";
import { answerProblems } from "../lib/matters/answer-check";
import { createMatter, loadMatter } from "../lib/matters/store";
import { MASTER, testDb } from "../lib/test/db";

/**
 * `pnpm run check:agent` — one matter turn through the REAL free chain.
 *
 * The scripted-model tests prove the loop; this proves the models: that the
 * shared chain actually calls tools, records a deadline from an invented
 * letter, and never sees the person's name. The database is PGlite in process,
 * so production data is never touched. Run on the host, where the keys are
 * (the "Agent check" workflow does exactly that); prints what happened.
 *
 * The letter is invented. Erika Muster is the German placeholder name.
 */
const available = freeAvailability(process.env).text;

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close?.());

const LETTER = `Kantonales Steueramt Zürich
Frau Erika Muster
Musterweg 4
8000 Zürich

Zürich, 2. Oktober 2026

Veranlagungsverfügung Staats- und Gemeindesteuern 2025

Sehr geehrte Frau Muster
Wir haben Ihre Steuererklärung 2025 veranlagt. Das steuerbare Einkommen wird auf CHF 98'400 festgesetzt.
Gegen diese Verfügung können Sie innert 30 Tagen nach Zustellung schriftlich Einsprache erheben. Die Zustellung erfolgte am 5. Oktober 2026.

Freundliche Grüsse
Kantonales Steueramt Zürich`;

describe.skipIf(!available)("a real model works a matter", () => {
  it("records the deadline, uses tools, and never sees the name", { timeout: 300_000 }, async () => {
    const seen: string[] = [];
    const tap: typeof fetch = async (input, init) => {
      if (typeof init?.body === "string") seen.push(init.body);
      return fetch(input, init);
    };
    const id = await createMatter(db, MASTER, {
      ownerSub: "actor-live",
      core: { title: "New matter", summary: "", area: "", facts: [], hide: ["Erika Muster"] },
    });
    const outcome = await runTurn({
      db, master: MASTER, matterId: id, sub: "actor-live", env: process.env, fetchImpl: tap, locale: "en",
      text: `I received this letter and want to object. What is my deadline? Please record it.\n\n${LETTER}`,
    });
    const view = (await loadMatter(db, MASTER, id, "actor-live"))!;
    const steps = view.events.filter((e) => e.kind === "step").map((e) => (e.kind === "step" ? `${e.tool}: ${e.summary}` : ""));
    const answer = view.events.filter((e) => e.kind === "message" && e.role === "assistant").at(-1);
    console.log(`[agent] outcome ${JSON.stringify(outcome)}`);
    console.log(`[agent] title ${view.core.title} | jurisdiction ${view.jurisdiction}`);
    for (const s of steps) console.log(`[agent] step ${s}`);
    for (const i of view.items) console.log(`[agent] item ${i.kind} ${i.due} ${i.label}`);
    console.log(`[agent] answer ${answer && answer.kind === "message" ? answer.text.slice(0, 600).replace(/\n/g, " ") : "-"}`);
    const sent = seen.join("\n");
    console.log(`[agent] model requests ${seen.length}; name sent: ${/Erika|Muster/.test(sent)}`);

    expect(outcome.ok).toBe(true);
    expect(sent).not.toMatch(/Erika|Muster/);
    expect(steps.length).toBeGreaterThan(0);
    expect(view.items.some((i) => i.kind === "deadline" && i.due === "2026-11-04")).toBe(true);
  });

  // The question that failed on the live site on 2026-10-22: no letter, a
  // workflow, a rule of law to find. The model answered from memory and wrote
  // its tool calls into the answer as text. Now it must research, or say so.
  it("researches a rule before stating it, and never writes its tool calls out", { timeout: 300_000 }, async () => {
    const id = await createMatter(db, MASTER, {
      ownerSub: "actor-live",
      jurisdiction: "CH-ZH",
      core: { title: "New matter", summary: "", area: "", facts: [], hide: [], workflow: "rent-increase" },
    });
    const outcome = await runTurn({
      db, master: MASTER, matterId: id, sub: "actor-live", env: process.env, locale: "en",
      text: "My landlord in Zürich notified me on 1 October 2026, on the official form, that my rent rises by 8% from 1 January 2027, citing increased costs. Can I contest it, by when, and with which authority?",
    });
    const view = (await loadMatter(db, MASTER, id, "actor-live"))!;
    const steps = view.events.filter((e) => e.kind === "step").map((e) => (e.kind === "step" ? e.tool : ""));
    const answer = view.events.filter((e) => e.kind === "message" && e.role === "assistant").at(-1);
    const text = answer && answer.kind === "message" ? answer.text : "";
    const sources = answer && answer.kind === "message" ? (answer.sources ?? []) : [];
    console.log(`[agent] rent: outcome ${JSON.stringify(outcome)}`);
    console.log(`[agent] rent: steps ${steps.join(", ")}`);
    for (const i of view.items) console.log(`[agent] rent: item ${i.kind} ${i.due} ${i.label}`);
    console.log(`[agent] rent: sources ${sources.map((s) => s.url).join(" ")}`);
    console.log(`[agent] rent: answer ${text.slice(0, 900).replace(/\n/g, " ")}`);

    expect(outcome.ok).toBe(true);
    expect(answerProblems(text, { toolNames: ["web_search", "read_page", "record_deadline", "update_matter", "draft_document", "note_fact", "request_approval"], sources: sources.length })).not.toContain("narrated");
    // Either it found sources, or it is visibly marked unverified: never a silent answer from memory.
    expect(sources.length > 0 || steps.includes("unverified")).toBe(true);
  });
});

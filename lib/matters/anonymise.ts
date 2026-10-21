import { createHash } from "node:crypto";
import { applyRedactions, assignTokens, findPersonalData, mapStrings, type Redaction } from "../redact";
import type { MatterView } from "./store";

/**
 * What a helper sees when the owner chose "anonymised": the same matter, with
 * the owner's personal details replaced by placeholders — the words the owner
 * asked to keep from any model, and every name, address, number and date of
 * birth lib/redact.ts finds. The same rule the model is held to, now applied
 * to a person the owner has not yet chosen to trust with their identity.
 *
 * ONE TABLE PER MATTER STATE. The table is built over everything the helper
 * can read — the matter, the thread, the deadlines, the approvals and the
 * documents — so "[NAME-1]" in the thread is "[NAME-1]" in the letter too.
 */
export function anonymiser(view: MatterView, documentTexts: string[]): (s: string) => string {
  const corpus = [
    JSON.stringify(view.core),
    ...view.events.map((e) => (e.kind === "message" ? e.text : e.summary)),
    ...view.items.map((i) => `${i.label}\n${i.quote ?? ""}`),
    ...view.approvals.map((a) => `${a.action}\n${a.summary}`),
    ...view.documents.map((d) => d.name),
    ...documentTexts,
  ].join("\n");
  const table: Redaction[] = assignTokens(findPersonalData(corpus, view.core.hide));
  return (s: string) => applyRedactions(s, table);
}

export function anonymiseView(view: MatterView, hide: (s: string) => string): MatterView {
  return {
    ...view,
    // The list of words to hide IS the owner's personal data.
    core: { ...mapStrings(view.core, hide), hide: [] },
    events: view.events.map((e) =>
      e.kind === "message"
        ? { ...e, text: hide(e.text), sources: e.sources }
        : { ...e, summary: hide(e.summary) },
    ),
    items: view.items.map((i) => ({ ...i, label: hide(i.label), quote: i.quote && hide(i.quote) })),
    approvals: view.approvals.map((a) => ({ ...a, action: hide(a.action), summary: hide(a.summary) })),
    documents: view.documents.map((d) => ({ ...d, name: hide(d.name) })),
  };
}

/**
 * Account ids are opaque, but the same id seen in two matters links them: a
 * pseudonymous helper could learn that two clients are one person, and a client
 * that two pseudonyms are one helper. So every id but the reader's own is
 * replaced by one that is stable within this matter and means nothing outside it.
 */
export function maskParticipants(view: MatterView, reader: string): MatterView {
  const mask = (sub: string) =>
    sub === reader || sub === "agent"
      ? sub
      : `p-${createHash("sha256").update(`${view.id}:${sub}`).digest("base64url").slice(0, 12)}`;
  return {
    ...view,
    participants: view.participants.map((p) => ({ ...p, sub: mask(p.sub) })),
    events: view.events.map((e) => ({ ...e, actor: mask(e.actor) })),
  };
}

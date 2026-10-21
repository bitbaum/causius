import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  matterSealer,
  newMatterKey,
  openMatterKey,
  type MatterSealer,
} from "../crypto";
import type { Db } from "../db";
import {
  approvals,
  documents,
  events,
  items,
  matters,
  participants,
} from "../db/schema";
import { applyRedactions, assignTokens, findPersonalData } from "../redact";
import { anonymiseView, anonymiser, maskParticipants } from "./anonymise";

/**
 * The matter engine: everything that reads or writes a matter goes through
 * here, and every entry point takes the caller's `sub` and checks that they
 * take part in the matter before touching it. A route cannot forget the check,
 * because there is no way in without it.
 *
 * Domain-agnostic on purpose. Nothing below knows it is about law; Diplodoctor
 * (health) and accounting will run on the same engine, and when the second
 * one adopts it, this directory becomes a package (fleet SHARED.md: extract at
 * the second consumer, not the first).
 */

export const ROLES = ["owner", "helper", "observer"] as const;
export type Role = (typeof ROLES)[number];

export const MatterCore = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(4000).default(""),
  area: z.string().trim().max(120).default(""),
  facts: z.array(z.string().trim().min(1).max(1000)).max(200).default([]),
  /** Words the owner wants kept from any model: their name, their employer. */
  hide: z.array(z.string().trim().min(2).max(120)).max(100).default([]),
});
export type MatterCore = z.infer<typeof MatterCore>;

export const JURISDICTION = /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/;

export type MessageEvent = {
  id: number;
  at: string;
  kind: "message";
  actor: string;
  role: "user" | "assistant";
  text: string;
  /** Web sources the agent cited in this message, by fact id. */
  sources?: { id: string; title: string; url: string }[];
};
export type StepEvent = {
  id: number;
  at: string;
  kind: "step";
  actor: string;
  /** What the agent did, in one line for the reader. */
  tool: string;
  summary: string;
};
export type MatterEvent = MessageEvent | StepEvent;

export interface Item {
  id: string;
  kind: "deadline" | "task";
  due: string | null;
  status: "open" | "done";
  label: string;
  quote?: string;
}

export interface Approval {
  id: string;
  status: "pending" | "approved" | "rejected";
  action: string;
  summary: string;
  documentId?: string;
  requestedAt: string;
  decidedAt?: string;
}

export interface DocumentMeta {
  id: string;
  name: string;
  mime: string;
  origin: "upload" | "draft";
  size: number;
  createdAt: string;
}

export type Sees = "full" | "anonymised";

export interface MatterView {
  id: string;
  role: Role;
  /** What the reader is shown: placeholders instead of the owner's details, or everything. */
  sees: Sees;
  status: "open" | "waiting" | "closed";
  jurisdiction: string | null;
  core: MatterCore;
  participants: { sub: string; role: Role; alias: string }[];
  events: MatterEvent[];
  items: Item[];
  approvals: Approval[];
  documents: DocumentMeta[];
  createdAt: string;
  updatedAt: string;
}

export interface MatterSummary {
  id: string;
  title: string;
  area: string;
  jurisdiction: string | null;
  status: "open" | "waiting" | "closed";
  /** The reader's part in it: their own matter, or one they help on. */
  role: Role;
  nextDue: { date: string; label: string } | null;
  pendingApprovals: number;
  updatedAt: string;
}

/** An opened matter: its row, the caller's role, and the sealer for its fields. */
export interface OpenMatter {
  id: string;
  role: Role;
  sees: Sees;
  sealer: MatterSealer;
}

export class NotAllowed extends Error {}

const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : d);

export async function openMatter(
  db: Db,
  master: Buffer,
  matterId: string,
  sub: string,
): Promise<OpenMatter | null> {
  if (!z.uuid().safeParse(matterId).success) return null;
  const rows = await db
    .select({ sealedKey: matters.sealedKey, role: participants.role, sees: participants.sees })
    .from(matters)
    .innerJoin(
      participants,
      and(eq(participants.matterId, matters.id), eq(participants.sub, sub)),
    )
    .where(eq(matters.id, matterId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const key = openMatterKey(master, row.sealedKey, matterId);
  return { id: matterId, role: row.role, sees: row.sees, sealer: matterSealer(key, matterId) };
}

async function touch(db: Db, matterId: string) {
  await db
    .update(matters)
    .set({ updatedAt: new Date() })
    .where(eq(matters.id, matterId));
}

export async function createMatter(
  db: Db,
  master: Buffer,
  input: { ownerSub: string; core: MatterCore; jurisdiction?: string | null },
): Promise<string> {
  const id = randomUUID();
  const { key, sealed: sealedKey } = newMatterKey(master, id);
  const sealer = matterSealer(key, id);
  const core = MatterCore.parse(input.core);
  const jurisdiction =
    input.jurisdiction && JURISDICTION.test(input.jurisdiction)
      ? input.jurisdiction
      : null;
  await db.transaction(async (tx) => {
    await tx.insert(matters).values({
      id,
      ownerSub: input.ownerSub,
      sealedKey,
      sealed: sealer.seal("core", core),
      jurisdiction,
    });
    await tx.insert(participants).values({
      matterId: id,
      sub: input.ownerSub,
      role: "owner",
      // A role, never a name: this column is not sealed. A person's real name
      // lives in the sealed core's words to hide.
      alias: "Client",
    });
  });
  return id;
}

export async function readCore(db: Db, m: OpenMatter): Promise<MatterCore> {
  const [row] = await db
    .select({ sealed: matters.sealed })
    .from(matters)
    .where(eq(matters.id, m.id));
  return MatterCore.parse(m.sealer.open("core", row!.sealed));
}

export async function updateCore(
  db: Db,
  m: OpenMatter,
  change: (core: MatterCore) => MatterCore,
  jurisdiction?: string | null,
): Promise<MatterCore> {
  if (m.role === "observer")
    throw new NotAllowed("observers cannot change a matter");
  const next = MatterCore.parse(change(await readCore(db, m)));
  await db
    .update(matters)
    .set({
      sealed: m.sealer.seal("core", next),
      updatedAt: new Date(),
      // undefined or an unrecognised code leaves the saved one alone; only an
      // explicit null clears it. A model that guesses "Switzerland" must not
      // erase the canton the person picked.
      ...(jurisdiction === null ||
      (jurisdiction !== undefined && JURISDICTION.test(jurisdiction))
        ? { jurisdiction }
        : {}),
    })
    .where(eq(matters.id, m.id));
  return next;
}

export async function appendMessage(
  db: Db,
  m: OpenMatter,
  msg: {
    actor: string;
    role: "user" | "assistant";
    text: string;
    sources?: MessageEvent["sources"];
  },
): Promise<number> {
  if (msg.role === "user" && m.role === "observer")
    throw new NotAllowed("observers cannot write");
  const [row] = await db
    .insert(events)
    .values({
      matterId: m.id,
      kind: "message",
      actor: msg.actor,
      sealed: m.sealer.seal("event", {
        role: msg.role,
        text: msg.text,
        sources: msg.sources,
      }),
    })
    .returning({ id: events.id });
  await touch(db, m.id);
  return row!.id;
}

export async function appendStep(
  db: Db,
  m: OpenMatter,
  step: { tool: string; summary: string },
) {
  await db.insert(events).values({
    matterId: m.id,
    kind: "step",
    actor: "agent",
    sealed: m.sealer.seal("event", step),
  });
}

export async function addItem(
  db: Db,
  m: OpenMatter,
  item: {
    kind: "deadline" | "task";
    due: string | null;
    label: string;
    quote?: string;
  },
): Promise<string> {
  const id = randomUUID();
  await db.insert(items).values({
    id,
    matterId: m.id,
    kind: item.kind,
    due: item.due,
    sealed: m.sealer.seal("item", { label: item.label, quote: item.quote }),
  });
  await touch(db, m.id);
  return id;
}

export async function setItemStatus(
  db: Db,
  m: OpenMatter,
  itemId: string,
  status: "open" | "done",
) {
  if (m.role === "observer")
    throw new NotAllowed("observers cannot change a matter");
  await db
    .update(items)
    .set({ status })
    .where(and(eq(items.id, itemId), eq(items.matterId, m.id)));
}

export async function requestApproval(
  db: Db,
  m: OpenMatter,
  a: { action: string; summary: string; documentId?: string },
): Promise<string> {
  const id = randomUUID();
  await db
    .insert(approvals)
    .values({ id, matterId: m.id, sealed: m.sealer.seal("approval", a) });
  await touch(db, m.id);
  return id;
}

/** Only the owner decides what leaves their matter. */
export async function decideApproval(
  db: Db,
  m: OpenMatter,
  approvalId: string,
  decision: "approved" | "rejected",
  sub: string,
): Promise<boolean> {
  if (m.role !== "owner") throw new NotAllowed("only the owner decides");
  const updated = await db
    .update(approvals)
    .set({ status: decision, decidedBySub: sub, decidedAt: new Date() })
    .where(
      and(
        eq(approvals.id, approvalId),
        eq(approvals.matterId, m.id),
        eq(approvals.status, "pending"),
      ),
    )
    .returning({ id: approvals.id });
  return updated.length === 1;
}

export const MAX_DOCUMENT_CHARS = 200_000;

export async function addDocument(
  db: Db,
  m: OpenMatter,
  doc: {
    name: string;
    mime: string;
    origin: "upload" | "draft";
    text: string;
    bySub: string;
  },
): Promise<string> {
  if (m.role === "observer")
    throw new NotAllowed("observers cannot add documents");
  const id = randomUUID();
  const text = doc.text.slice(0, MAX_DOCUMENT_CHARS);
  await db.insert(documents).values({
    id,
    matterId: m.id,
    sealedMeta: m.sealer.seal("document-meta", {
      name: doc.name.slice(0, 200),
      mime: doc.mime,
      origin: doc.origin,
    }),
    sealedText: m.sealer.seal("document-text", text),
    size: Buffer.byteLength(text, "utf8"),
    createdBySub: doc.bySub,
  });
  await touch(db, m.id);
  return id;
}

/**
 * One document, as the reader may see it: anonymised for a helper the owner
 * did not show their details to. The agent reads the matter as it is (it hides
 * personal details from the model on its own, lib/matters/agent.ts), so it
 * passes a matter opened with `sees: "full"`.
 */
export async function readDocument(
  db: Db,
  m: OpenMatter,
  documentId: string,
): Promise<{ meta: DocumentMeta; text: string } | null> {
  const doc = await readDocumentRaw(db, m, documentId);
  if (!doc || m.sees === "full") return doc;
  const hide = await anonymiserFor(db, m);
  return { meta: { ...doc.meta, name: hide(doc.meta.name) }, text: hide(doc.text) };
}

async function readDocumentRaw(
  db: Db,
  m: OpenMatter,
  documentId: string,
): Promise<{ meta: DocumentMeta; text: string } | null> {
  if (!z.uuid().safeParse(documentId).success) return null;
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.matterId, m.id)));
  if (!row) return null;
  const meta = m.sealer.open<Omit<DocumentMeta, "id" | "size" | "createdAt">>(
    "document-meta",
    row.sealedMeta,
  );
  return {
    meta: {
      ...meta,
      id: row.id,
      size: row.size,
      createdAt: iso(row.createdAt),
    },
    text: m.sealer.open<string>("document-text", row.sealedText),
  };
}

/**
 * The whole matter as `sub` may see it. Every reader but the owner sees other
 * participants under ids that mean nothing outside this matter, and a helper
 * the owner did not show their details to sees placeholders instead
 * (lib/matters/anonymise.ts). `raw` is for the agent, which works on the
 * matter itself and hides details from the model by its own rule.
 */
export async function loadMatter(
  db: Db,
  master: Buffer,
  matterId: string,
  sub: string,
  options: { raw?: boolean } = {},
): Promise<MatterView | null> {
  const m = await openMatter(db, master, matterId, sub);
  if (!m) return null;
  const view = await loadView(db, m);
  if (options.raw) return view;
  const masked = maskParticipants(view, sub);
  if (m.sees === "full") return masked;
  const hide = anonymiser(view, await documentTexts(db, m, view));
  return anonymiseView(masked, hide);
}

async function documentTexts(db: Db, m: OpenMatter, view: MatterView): Promise<string[]> {
  const texts: string[] = [];
  for (const d of view.documents) {
    const doc = await readDocumentRaw(db, m, d.id);
    if (doc) texts.push(doc.text);
  }
  return texts;
}

async function anonymiserFor(db: Db, m: OpenMatter): Promise<(s: string) => string> {
  const view = await loadView(db, m);
  return anonymiser(view, await documentTexts(db, m, view));
}

async function loadView(db: Db, m: OpenMatter): Promise<MatterView> {
  const matterId = m.id;
  const [row] = await db.select().from(matters).where(eq(matters.id, matterId));
  const [ps, evs, its, aps, docs] = await Promise.all([
    db
      .select()
      .from(participants)
      .where(eq(participants.matterId, matterId))
      .orderBy(asc(participants.addedAt)),
    db
      .select()
      .from(events)
      .where(eq(events.matterId, matterId))
      .orderBy(asc(events.id)),
    db
      .select()
      .from(items)
      .where(eq(items.matterId, matterId))
      .orderBy(asc(items.due), asc(items.createdAt)),
    db
      .select()
      .from(approvals)
      .where(eq(approvals.matterId, matterId))
      .orderBy(desc(approvals.requestedAt)),
    db
      .select()
      .from(documents)
      .where(eq(documents.matterId, matterId))
      .orderBy(asc(documents.createdAt)),
  ]);

  return {
    id: matterId,
    role: m.role,
    sees: m.sees,
    status: row!.status,
    jurisdiction: row!.jurisdiction,
    core: MatterCore.parse(m.sealer.open("core", row!.sealed)),
    participants: ps.map((p) => ({ sub: p.sub, role: p.role, alias: p.alias })),
    events: evs.map((e): MatterEvent => {
      const body = m.sealer.open<Record<string, unknown>>("event", e.sealed);
      return e.kind === "message"
        ? {
            id: e.id,
            at: iso(e.at),
            kind: "message",
            actor: e.actor,
            role: body.role as "user" | "assistant",
            text: String(body.text ?? ""),
            sources: body.sources as MessageEvent["sources"],
          }
        : {
            id: e.id,
            at: iso(e.at),
            kind: "step",
            actor: e.actor,
            tool: String(body.tool),
            summary: String(body.summary),
          };
    }),
    items: its.map((i) => {
      const body = m.sealer.open<{ label: string; quote?: string }>(
        "item",
        i.sealed,
      );
      return {
        id: i.id,
        kind: i.kind,
        due: i.due,
        status: i.status,
        label: body.label,
        quote: body.quote,
      };
    }),
    approvals: aps.map((a) => {
      const body = m.sealer.open<{
        action: string;
        summary: string;
        documentId?: string;
      }>("approval", a.sealed);
      return {
        id: a.id,
        status: a.status,
        ...body,
        requestedAt: iso(a.requestedAt),
        decidedAt: a.decidedAt ? iso(a.decidedAt) : undefined,
      };
    }),
    documents: docs.map((d) => ({
      ...m.sealer.open<Omit<DocumentMeta, "id" | "size" | "createdAt">>(
        "document-meta",
        d.sealedMeta,
      ),
      id: d.id,
      size: d.size,
      createdAt: iso(d.createdAt),
    })),
    createdAt: iso(row!.createdAt),
    updatedAt: iso(row!.updatedAt),
  };
}

/** The caller's matters, newest activity first, with what needs attention. */
export async function listMatters(
  db: Db,
  master: Buffer,
  sub: string,
): Promise<MatterSummary[]> {
  const rows = await db
    .select({
      id: matters.id,
      sealed: matters.sealed,
      sealedKey: matters.sealedKey,
      jurisdiction: matters.jurisdiction,
      status: matters.status,
      updatedAt: matters.updatedAt,
      role: participants.role,
      sees: participants.sees,
    })
    .from(matters)
    .innerJoin(
      participants,
      and(eq(participants.matterId, matters.id), eq(participants.sub, sub)),
    )
    .orderBy(desc(matters.updatedAt))
    .limit(200);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [dues, pending] = await Promise.all([
    db
      .select({
        matterId: items.matterId,
        due: items.due,
        sealed: items.sealed,
      })
      .from(items)
      .where(
        and(
          inArray(items.matterId, ids),
          eq(items.status, "open"),
          sql`${items.due} is not null`,
        ),
      )
      .orderBy(asc(items.due)),
    db
      .select({ matterId: approvals.matterId, n: sql<number>`count(*)::int` })
      .from(approvals)
      .where(
        and(inArray(approvals.matterId, ids), eq(approvals.status, "pending")),
      )
      .groupBy(approvals.matterId),
  ]);
  return rows.map((r) => {
    const sealer = matterSealer(openMatterKey(master, r.sealedKey, r.id), r.id);
    const core = MatterCore.parse(sealer.open("core", r.sealed));
    const next = dues.find((d) => d.matterId === r.id);
    const label = next?.due ? sealer.open<{ label: string }>("item", next.sealed).label : "";
    // A list line is anonymised by what it shows, against the owner's words to hide.
    const hide =
      r.sees === "anonymised"
        ? (s: string) => applyRedactions(s, assignTokens(findPersonalData(`${core.title}\n${core.area}\n${label}`, core.hide)))
        : (s: string) => s;
    return {
      id: r.id,
      title: hide(core.title),
      area: hide(core.area),
      jurisdiction: r.jurisdiction,
      status: r.status,
      role: r.role,
      nextDue: next?.due ? { date: next.due, label: hide(label) } : null,
      pendingApprovals: pending.find((p) => p.matterId === r.id)?.n ?? 0,
      updatedAt: iso(r.updatedAt),
    };
  });
}

export async function deleteMatter(db: Db, m: OpenMatter) {
  if (m.role !== "owner")
    throw new NotAllowed("only the owner deletes a matter");
  await db.delete(matters).where(eq(matters.id, m.id));
}

import { bigserial, date, index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Causius's database. Postgres on the box, through Drizzle (fleet STACK.md).
 *
 * NO USERS TABLE. A person is the OrangeCat actor id from the signed id_token
 * (`sub`), and nothing else about them is kept here — fleet AGENTS.md,
 * "Identity". Where a column says `*_sub`, it holds that id.
 *
 * WHAT IS PLAIN AND WHAT IS SEALED. Every column named `sealed*` holds
 * ciphertext under the matter's own key (lib/crypto.ts): titles, facts,
 * messages, documents, deadline labels, approval details. What stays plain is
 * only what the database must compare or sort: ids, who takes part, statuses,
 * dates, a jurisdiction code. A dump of this database says that someone has a
 * matter in Zürich with a deadline on 30 October — not what it is about.
 */

export const matters = pgTable(
  "matters",
  {
    id: uuid("id").primaryKey(),
    ownerSub: text("owner_sub").notNull(),
    /** The matter's data key, sealed with the master key. */
    sealedKey: text("sealed_key").notNull(),
    /** { title, summary, area, facts[], hide[] } */
    sealed: text("sealed").notNull(),
    /** ISO 3166 code with an optional subdivision: "CH", "CH-ZH". For matching helpers later. */
    jurisdiction: text("jurisdiction"),
    status: text("status", { enum: ["open", "waiting", "closed"] }).notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("matters_owner_idx").on(t.ownerSub)],
);

/** Who takes part in a matter. Permission is participation (threadkit's rule). */
export const participants = pgTable(
  "participants",
  {
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    sub: text("sub").notNull(),
    role: text("role", { enum: ["owner", "helper", "observer"] }).notNull(),
    /** The name this person goes by in this matter. A pseudonym is normal. */
    alias: text("alias").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.matterId, t.sub] }), index("participants_sub_idx").on(t.sub)],
);

/**
 * The matter's history, append-only: messages between the person, helpers
 * and the agent, and every step the agent took. Never updated, never deleted
 * except with the whole matter.
 */
export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    kind: text("kind", { enum: ["message", "step"] }).notNull(),
    /** A sub, or "agent". */
    actor: text("actor").notNull(),
    sealed: text("sealed").notNull(),
  },
  (t) => [index("events_matter_idx").on(t.matterId, t.id)],
);

/** Deadlines and tasks. The date is plain so "what is due this week" is one query. */
export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey(),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["deadline", "task"] }).notNull(),
    due: date("due"),
    status: text("status", { enum: ["open", "done"] }).notNull().default("open"),
    /** { label, quote? } */
    sealed: text("sealed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("items_matter_idx").on(t.matterId), index("items_due_idx").on(t.due)],
);

/**
 * Anything that would leave the matter — sending a letter, filing, sharing
 * with someone, signing, paying — waits here for a person to decide. The agent
 * can propose; it cannot act on the world.
 */
export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey(),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
    /** { action, summary, documentId? } */
    sealed: text("sealed").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    decidedBySub: text("decided_by_sub"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [index("approvals_matter_idx").on(t.matterId)],
);

/** Documents: the person's own, and drafts the agent wrote. Sealed whole. */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey(),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    /** { name, mime, origin: "upload" | "draft" } */
    sealedMeta: text("sealed_meta").notNull(),
    /** The extracted text, sealed. What the agent reads. */
    sealedText: text("sealed_text").notNull(),
    size: integer("size").notNull(),
    createdBySub: text("created_by_sub").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_matter_idx").on(t.matterId)],
);

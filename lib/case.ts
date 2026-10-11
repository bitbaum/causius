import { z } from "zod";

/**
 * The case file — the one shape everything in Causius reads and writes.
 *
 * The AI analysis produces it, the browser stores it, a human helper is handed
 * it, and "Export" writes exactly it to disk. One shape on purpose: a case that
 * can be exported and re-imported belongs to the person it is about, not to us.
 *
 * The zod schema below IS the definition; the TypeScript types are inferred
 * from it, so the two cannot disagree.
 *
 * Lenient about what is missing, strict about types. Both sources — a model's
 * JSON and an imported file — are untrusted, and a case that renders
 * "undefined" as its deadline is worse than one that renders no deadline. So a
 * bad optional field is dropped rather than failing the whole case, and only a
 * missing title makes something not a case at all.
 */

/** Trimmed, capped text. Over-long input is cut, not refused. */
const text = (max: number) =>
  z
    .string()
    .transform((s) => s.trim().slice(0, max))
    .pipe(z.string().min(1));

const optionalText = (max: number) => text(max).optional().catch(undefined);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(s)))
  .optional()
  .catch(undefined);

/** A list whose bad members are dropped instead of sinking the list. */
const listOf = <T extends z.ZodType>(item: T, max: number) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((list) =>
      list.slice(0, max).flatMap((entry) => {
        const parsed = item.safeParse(entry);
        return parsed.success ? [parsed.data as z.output<T>] : [];
      }),
    );

/** Who may do what. The line between the last two is the law, not a price tier. */
export const HELPER_TIERS = ["ai", "assistant", "lawyer"] as const;
export type HelperTier = (typeof HELPER_TIERS)[number];

const CaseAskSchema = z.object({
  id: optionalText(40),
  /** What the other side wants, in plain words. */
  text: text(1000),
  /** Things that would satisfy it. */
  evidence: listOf(text(300), 20),
  done: z.boolean().catch(false),
});

const CaseTextSchema = z.object({
  /** BCP-47 tag, e.g. "de", "tr", "fr". */
  lang: text(12).catch("und"),
  label: optionalText(40),
  text: text(20_000),
});

export const CaseFileSchema = z
  .object({
    id: optionalText(60),
    title: text(200),
    jurisdiction: optionalText(120),
    area: optionalText(120),
    authority: optionalText(200),
    reference: optionalText(120),
    /** ISO dates (YYYY-MM-DD). */
    received: isoDate,
    deadline: isoDate,
    /**
     * The sentence of the document the deadline was read from, verbatim. A
     * wrong deadline is the worst thing this product can produce, so the date
     * is never shown without the words it came from for the reader to check.
     */
    deadlineQuote: optionalText(500),
    summary: text(3000).catch(""),
    /** What happens if nothing is done. */
    consequence: optionalText(1000),
    asks: listOf(CaseAskSchema, 40),
    /** The document itself: original first, then translations. */
    texts: listOf(CaseTextSchema, 8),
    draftReply: CaseTextSchema.optional().catch(undefined),
    notes: listOf(text(600), 20),
    recommendedTier: z.enum(HELPER_TIERS).catch("assistant"),
    tierReason: optionalText(600),
    createdAt: optionalText(40),
  })
  .transform((c) => ({
    ...c,
    version: 1 as const,
    id: c.id ?? newId(),
    asks: c.asks.map((a, i) => ({ ...a, id: a.id ?? `a${i + 1}` })),
    texts: c.texts.map(withLabel),
    draftReply: c.draftReply && withLabel(c.draftReply),
    createdAt: c.createdAt ?? new Date().toISOString(),
  }));

function withLabel<T extends { lang: string; label?: string }>(t: T): T & { label: string } {
  return { ...t, label: t.label ?? t.lang };
}

export type CaseFile = z.output<typeof CaseFileSchema>;
export type CaseAsk = CaseFile["asks"][number];
export type CaseText = CaseFile["texts"][number];

export function newId(): string {
  return `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Turn anything — a model's JSON, an imported file — into a CaseFile, or null. */
export function parseCase(input: unknown): CaseFile | null {
  const parsed = CaseFileSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

/** Whole days from `today` to `deadline`; negative when it has passed. */
export function daysUntil(deadline: string, today: string): number {
  return Math.round((Date.parse(deadline) - Date.parse(today)) / 86_400_000);
}

/** A date in the reader's language, without shifting it across time zones. */
export function formatDate(iso: string, locale = "en"): string {
  const tag = locale === "en" ? "en-GB" : `${locale}-CH`;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(tag, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

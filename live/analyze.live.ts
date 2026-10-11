import { describe, expect, it } from "vitest";
import { AnalyzeRequestSchema, analyzeLetter, freeAvailability } from "../lib/analyze";
import { SAMPLE_DEADLINE, SAMPLE_LETTER } from "../lib/sample";

/**
 * `pnpm run check:analyze` — the invented sample letter through a REAL model.
 *
 * Not part of `verify` or CI: it needs a vendor key and the network, and a
 * gate that goes red for want of a secret trains you to ignore red. Run it on
 * the host after setting a key, and whenever the prompt or the chain changes.
 *
 * It asserts the two things a wrong answer would hurt most: the deadline, and
 * that the deadline comes with the sentence it was read from. Everything else
 * is printed for a person to read.
 *
 * Uses the shared free chain from the environment (GROQ_API_KEY,
 * GEMINI_API_KEY, OPENROUTER_API_KEY). Costs one free-tier completion per
 * language.
 */
const available = freeAvailability(process.env).text;

describe.skipIf(!available)("a real model reads the sample letter", () => {
  it.each(["en", "de", "fr"] as const)(
    "finds the deadline and its source sentence, answering in %s",
    async (locale) => {
      const outcome = await analyzeLetter(
        AnalyzeRequestSchema.parse({ text: SAMPLE_LETTER, locale, languages: ["English"] }),
        { env: process.env },
      );
      if (!outcome.ok) throw new Error(`analysis failed: ${outcome.error}`);
      const c = outcome.case;
      console.info(
        `\n[${locale}] served by ${outcome.servedBy}\n  title: ${c.title}\n  deadline: ${c.deadline} — «${c.deadlineQuote}»\n  asks: ${c.asks.length}, texts: ${c.texts.map((t) => t.lang).join(", ")}, tier: ${c.recommendedTier}\n  summary: ${c.summary}`,
      );
      expect(c.deadline).toBe(SAMPLE_DEADLINE);
      expect(c.deadlineQuote).toContain("23. März 2026");
      // The letter asks for five things (1, 1.1, 2, 3, 4); a model may merge 1 and 1.1.
      expect(c.asks.length).toBeGreaterThanOrEqual(4);
      expect(c.texts.length).toBeGreaterThanOrEqual(2);
      // A residence permit is at stake.
      expect(c.recommendedTier).toBe("lawyer");
      expect(c.draftReply?.text).toMatch(/\[.+\]/);
    },
    180_000,
  );
});

describe.skipIf(available)("no vendor key in the environment", () => {
  it("has nothing to check — set GROQ_API_KEY, GEMINI_API_KEY or OPENROUTER_API_KEY", () => {
    console.info("check:analyze skipped: no shared vendor key is set.");
  });
});

import { describe, expect, it } from "vitest";
import en from "../messages/en.json";

/**
 * Words are a cost. Every sentence on a page is read, skipped or resented, and
 * a page that grows a sentence at a time ends up a document nobody opens. So the
 * pages people land on have a word budget, and this fails when one is passed.
 * To add copy, cut copy: the budget is the point, not an obstacle.
 *
 * Counted in English, the source language; the others are translations of it.
 * The `meta*` keys are for search engines, not for the page, and are not
 * counted. Reference pages (platform, security) are for readers who chose to
 * read, and have a ceiling rather than a target. A page's budget covers the
 * message namespaces it renders, listed together below.
 */
type Tree = { [key: string]: string | Tree };

function words(tree: string | Tree, top = true): number {
  if (typeof tree === "string") return tree.trim().split(/\s+/).filter(Boolean).length;
  return Object.entries(tree)
    .filter(([key]) => !(top && key.startsWith("meta")))
    .reduce((sum, [, v]) => sum + words(v, false), 0);
}

const BUDGETS: { page: string; namespaces: string[]; budget: number }[] = [
  // What a first visit reads. Raised from 240 on 2026-10-21 for the redesign,
  // knowingly: the prose sentences went DOWN, and most of these words are now
  // labels inside pictures (the worked letter, the two calendars, the
  // comparison table, the anonymisation drawn), which are read at a glance.
  // Do not spend the headroom on sentences.
  { page: "Home", namespaces: ["Home", "Entry"], budget: 360 },
  // The place matters are started from: short by construction.
  { page: "Matters", namespaces: ["Matters"], budget: 190 },
  // The common problems offered on the same page: a name and one line each.
  { page: "Workflows", namespaces: ["Workflows"], budget: 160 },
  // A form: every line is something someone must read to proceed, and the
  // error lines are what they read when it goes wrong.
  { page: "NewCase (quick check)", namespaces: ["NewCase"], budget: 310 },
  // The result, around the case's own content.
  { page: "Case", namespaces: ["Case"], budget: 170 },
  // The working screen of a matter. Held where it stands: it may fall, not rise.
  { page: "Matter", namespaces: ["Matter"], budget: 380 },
  // Explains a choice; reference rather than landing.
  { page: "Helpers", namespaces: ["Helpers"], budget: 280 },
  { page: "Platform", namespaces: ["Platform", "Capabilities"], budget: 650 },
  { page: "Security", namespaces: ["Security"], budget: 420 },
];

describe("copy budget", () => {
  it.each(BUDGETS)("$page stays within $budget words", ({ namespaces, budget }) => {
    const total = namespaces.reduce((sum, ns) => sum + words((en as Tree)[ns]!), 0);
    expect(total).toBeLessThanOrEqual(budget);
  });
});

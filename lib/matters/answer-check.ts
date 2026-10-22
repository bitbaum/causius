/**
 * What an agent's final answer must not do, checked by the server rather than
 * hoped for in a prompt.
 *
 * Found on the live site (2026-10-22): a free model answered a rent-increase
 * question without calling a single tool — and wrote the calls it should have
 * made into the answer as text ("update_matter(…)", "record_deadline(…)").
 * Nothing was searched, no deadline was recorded, and the rules it stated had
 * no source. Every sentence looked finished. That is the fabrication path the
 * product promises not to take, so it is caught here, mechanically:
 *
 *   narrated   — tool calls written out instead of made (as name(…), as a
 *                TOOL line, or as JSON naming the tool), or an answer that
 *                is only the loop's own note of a call ("(called web_search)"),
 *                which a model copies from the conversation as its answer
 *
 * Tried and withdrawn the same day: giving the model ai-kit's
 * TEXT_TOOL_PROTOCOL_HINT. With it, the chain's models (all of which call
 * natively) switched to text calls and then answered "(called note_fact)"; the
 * real-model Agent check went from passing to failing. Without it, it passes.
 *   unsourced  — a rule of law stated in a turn that consulted no source
 *   unrecorded — a deadline date given in the answer while the matter holds
 *                no deadline: the Agent check saw a model compute "4 November
 *                2026" correctly and never call record_deadline, so the
 *                reminder the person relies on was never set
 *
 * The agent gets a precise correction (at most two per turn, each answered by
 * the next model in the chain) and tries again; an answer still failing is
 * stored with a visible "unverified" step, never silently.
 */
import { stripToolCallLines } from "@bitbaum/ai-kit";

export type AnswerProblem = "narrated" | "unsourced" | "unrecorded";

/** A statement of law: an article, a paragraph sign, a Swiss/Liechtenstein code or collection number. */
const CITES_LAW =
  /(?:\b[Aa]rt(?:ikel|icle|icolo|ículo|\.)\s*\d|§\s*\d|\b(?:OR|ZGB|StGB|SchKG|ZPO|DBG|StHG|AIG|ATSG|CO|CC|CPC|LP|PGR|ABGB)\b\s*(?:Art\.?\s*)?\d|\bSR\s*\d{3}|\bLGBl\.?\s*\d)/;

const MONTHS =
  "Jan(?:uary|uar)?|Feb(?:ruary|ruar)?|M(?:ar(?:ch)?|ärz)|Apr(?:il)?|Ma[iy]|June?|Juni|July?|Juli|Aug(?:ust)?|Sep(?:tember)?|O[ck]t(?:ober)?|Nov(?:ember)?|De[cz](?:ember)?|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre";
/** A calendar date: "4 November 2026", "4. November 2026", "04.11.2026", "2026-11-04". */
const DATE = new RegExp(
  `\\b\\d{1,2}\\.?\\s*(?:${MONTHS})\\.?\\s+\\d{4}\\b|\\b\\d{1,2}\\.\\d{1,2}\\.\\d{4}\\b|\\b\\d{4}-\\d{2}-\\d{2}\\b`,
  "i",
);
const DEADLINE_WORD = /\b(?:deadline|Frist|délai|termine|scadenza)/i;

export function answerProblems(
  text: string,
  turn: { toolNames: readonly string[]; sources: number; deadlines?: number },
): AnswerProblem[] {
  const problems: AnswerProblem[] = [];
  const names = turn.toolNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const narrated = new RegExp(
    `\\b(?:${names})\\s*\\(|[:=]\\s*"(?:${names})"|^\\s*(?:\\*\\*)?TOOL(?:\\*\\*)?\\s*[:=]`,
    "m",
  );
  if ((names && narrated.test(text)) || /^\s*\(called [\w, ]+\)\s*$/.test(text)) problems.push("narrated");
  if (turn.sources === 0 && CITES_LAW.test(text)) problems.push("unsourced");
  if (turn.deadlines === 0 && DEADLINE_WORD.test(text) && DATE.test(text)) problems.push("unrecorded");
  return problems;
}

/** The correction the agent is sent, one sentence per problem. Written for the model. */
export function repairPrompt(problems: readonly AnswerProblem[]): string {
  const lines = problems.map((p) =>
    p === "narrated"
      ? "Your answer describes tool calls instead of making them. Nothing you described has happened. Call the tools now (natively, or with the TOOL/ARGS lines), then answer."
      : p === "unrecorded"
        ? "Your answer gives a deadline, but none is recorded in the matter. Call record_deadline now for each deadline, quoting the text it comes from, then answer."
        : "Your answer states rules of law, but this turn consulted no source. Read each one now: read_law for a Swiss federal or Liechtenstein act (act and article), web_search and read_page for anything else. Cite each as [n], and drop or mark as unverified any rule you cannot source.",
  );
  return `${lines.join("\n")}\nDo not apologise or mention this message; just do it.`;
}

/**
 * An answer that still narrates after its one correction is stored without
 * the narration: TOOL/ARGS lines, notes of calls, fenced JSON naming a tool.
 * The last round offers no tools, so nothing parses them there; left in, they
 * read as work done. What remains may be empty, and the caller says so.
 */
export function withoutNarration(text: string, toolNames: readonly string[]): string {
  const names = new Set(toolNames);
  return stripToolCallLines(text)
    .replace(/```[a-z]*\n([\s\S]*?)```/g, (block, body: string) =>
      [...body.matchAll(/"(\w+)"/g)].some((m) => names.has(m[1])) ? "" : block,
    )
    .replace(/^\s*\(called [\w, ]+\)\s*$/gm, "")
    .trim();
}

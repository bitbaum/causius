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
 *   narrated   — tool calls written out instead of made
 *   unsourced  — a rule of law stated in a turn that consulted no source
 *
 * The agent gets one precise correction per problem and tries again; an answer
 * still failing is stored with a visible "not checked against a source" step,
 * never silently.
 */
export type AnswerProblem = "narrated" | "unsourced";

/** A statement of law: an article, a paragraph sign, a Swiss/Liechtenstein code or collection number. */
const CITES_LAW =
  /(?:\b[Aa]rt(?:ikel|icle|icolo|ículo|\.)\s*\d|§\s*\d|\b(?:OR|ZGB|StGB|SchKG|ZPO|DBG|StHG|AIG|ATSG|CO|CC|CPC|LP|PGR|ABGB)\b\s*(?:Art\.?\s*)?\d|\bSR\s*\d{3}|\bLGBl\.?\s*\d)/;

export function answerProblems(
  text: string,
  turn: { toolNames: readonly string[]; sources: number },
): AnswerProblem[] {
  const problems: AnswerProblem[] = [];
  const names = turn.toolNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const narrated = new RegExp(`\\b(?:${names})\\s*\\(|^\\s*(?:\\*\\*)?TOOL(?:\\*\\*)?\\s*[:=]`, "m");
  if (names && narrated.test(text)) problems.push("narrated");
  if (turn.sources === 0 && CITES_LAW.test(text)) problems.push("unsourced");
  return problems;
}

/** The correction the agent is sent, one sentence per problem. Written for the model. */
export function repairPrompt(problems: readonly AnswerProblem[]): string {
  const lines = problems.map((p) =>
    p === "narrated"
      ? "Your answer describes tool calls instead of making them. Nothing you described has happened. Call the tools now (natively, or with the TOOL/ARGS lines), then answer."
      : "Your answer states rules of law, but this turn consulted no source. Use web_search and read_page now to find the official text for each rule, cite it as [n], and drop or mark as unverified any rule you cannot source.",
  );
  return `${lines.join("\n")}\nDo not apologise or mention this message; just do it.`;
}

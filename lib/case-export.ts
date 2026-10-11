import type { CaseFile } from "./case";
import { applyRedactions, assignTokens, findPersonalData, mapStrings } from "./redact";

/**
 * The case as a helper should get it: every personal detail replaced by its
 * placeholder again, and the table of what the placeholders mean left out. A
 * helper can work the case — the deadline, what is asked, the letter — without
 * learning who it is about until the reader decides to tell them.
 *
 * Uses the table from the original analysis; a case without one (filed by
 * hand, or imported) is searched afresh.
 */
export function anonymisedCase(data: CaseFile): CaseFile {
  const table = data.redactions.length
    ? data.redactions
    : assignTokens(findPersonalData(data.texts.map((t) => t.text).join("\n")));
  const { redactions: _omit, ...rest } = data;
  void _omit;
  return { ...mapStrings(rest, (s) => applyRedactions(s, table)), id: data.id, redactions: [] };
}

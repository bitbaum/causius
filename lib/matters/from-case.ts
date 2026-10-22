import type { CaseFile } from "../case";
import type { Db } from "../db";
import { jurisdictionFromText } from "../jurisdictions";
import { addDocument, addItem, appendStep, createMatter, openMatter, wordsToHide } from "./store";

/** The few words the new matter needs, in the reader's language. */
export interface FromCaseWords {
  /** The deadline item's label. */
  deadline: string;
  /** The letter's document name. */
  letter: string;
  /** The draft reply's document name. */
  reply: string;
}

/**
 * A quick check, brought into a sealed matter in one step: what the browser
 * kept becomes what the agent works from.
 *
 * - The deadline arrives as an item WITH the sentence it was read from, so the
 *   matter shows the same check the quick check did.
 * - The letter is the matter's first document; a drafted reply, its first draft.
 * - Every value the quick check hid from the model (names, addresses, IBANs…)
 *   becomes a word to hide, so the agent keeps hiding them. They were only in
 *   the browser before; from here they are sealed under the matter's key.
 */
export async function matterFromCase(
  db: Db,
  master: Buffer,
  input: { sub: string; accountName?: string | null; data: CaseFile; words: FromCaseWords },
): Promise<string> {
  const { data, words } = input;
  const facts = [...data.asks.map((a) => a.text), ...(data.consequence ? [data.consequence] : [])].slice(0, 200);
  const id = await createMatter(db, master, {
    ownerSub: input.sub,
    jurisdiction: jurisdictionFromText(data.jurisdiction),
    core: {
      title: data.title,
      summary: data.summary,
      area: data.area ?? "",
      facts,
      hide: wordsToHide(input.accountName, data.redactions.map((r) => r.value)).slice(0, 100),
    },
  });
  const m = (await openMatter(db, master, id, input.sub))!;
  if (data.deadline)
    await addItem(db, m, { kind: "deadline", due: data.deadline, label: words.deadline, quote: data.deadlineQuote });
  const original = data.texts[0];
  if (original)
    await addDocument(db, m, { name: words.letter, mime: "text/plain", origin: "upload", text: original.text, bySub: input.sub });
  if (data.draftReply)
    await addDocument(db, m, { name: words.reply, mime: "text/plain", origin: "draft", text: data.draftReply.text, bySub: input.sub });
  await appendStep(db, m, { tool: "from_case", summary: data.title });
  return id;
}

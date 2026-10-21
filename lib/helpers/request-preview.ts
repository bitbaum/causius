import { applyRedactions, assignTokens, findPersonalData } from "../redact";

export interface HelpRequestText {
  title: string;
  area: string;
  message: string;
}

/**
 * What a helper reads of a request the owner sends without their personal
 * details. Pure and shared: the server stores exactly this, and the form shows
 * exactly this before sending — so a name the patterns miss is seen, and
 * added to the words to hide, before it leaves.
 */
export function anonymiseRequest(text: HelpRequestText, hide: readonly string[]): HelpRequestText {
  const table = assignTokens(findPersonalData(`${text.title}\n${text.area}\n${text.message}`, [...hide]));
  return {
    title: applyRedactions(text.title, table),
    area: applyRedactions(text.area, table),
    message: applyRedactions(text.message, table),
  };
}

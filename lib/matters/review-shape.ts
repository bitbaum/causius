/**
 * The shape of a document review, shared by the server (review.ts) and the
 * panel in the browser. Kept apart because review.ts reaches the database and
 * the model chain, which must never be bundled for a browser.
 */
export const MAX_QUESTIONS = 3;

export interface ReviewCell {
  answer: string;
  /** The passage, verbatim from the document. Absent when nothing was found. */
  quote?: string;
}
export interface ReviewRow {
  documentId: string;
  name: string;
  cells: ReviewCell[];
}
export interface ReviewTable {
  questions: string[];
  rows: ReviewRow[];
  /** The draft document the table was saved as. */
  documentId?: string;
}

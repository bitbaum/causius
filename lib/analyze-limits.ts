/**
 * The limits the intake page and the analysis route must agree on, in a file
 * with no imports so the browser bundle can read them without pulling in the
 * model client.
 */
export const MAX_TEXT = 30_000;
/** A letter is rarely longer; more pages than this is a file, not a letter. */
export const MAX_PAGES = 4;
/** Base64 length of roughly 3 MB. The browser shrinks a photo well below this. */
export const MAX_IMAGE_B64 = 4_200_000;

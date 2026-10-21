import { TRANSLATION_LANGUAGES } from "./languages";

/**
 * Who may help, and what each kind may do. The one place this is decided.
 *
 * Causius's matter and helper engine knows nothing about law; this file is the
 * domain. Diplodoctor runs the same shape with `doctor` where this says
 * `lawyer`: change the kinds here and the credential they need, not the store.
 *
 * The line between `assistant` and `lawyer` is set by law in almost every
 * country, not by us: only an admitted lawyer may give legal advice or
 * represent someone. So a lawyer is LISTED only for the jurisdictions a
 * reviewer has verified, never for the ones they type in.
 */
export const HELPER_KINDS = ["ai", "assistant", "lawyer"] as const;
export type HelperKind = (typeof HELPER_KINDS)[number];

export const CREDENTIAL_KINDS = ["bar_admission"] as const;
export type CredentialKind = (typeof CREDENTIAL_KINDS)[number];

export interface Profession {
  /** May give advice and represent, where verified. */
  mayAdvise: boolean;
  /** The credential that must be verified before the profile is listed, if any. */
  requires: CredentialKind | null;
  /** A person operates it rather than being it: an AI service answers through its operator. */
  operated: boolean;
}

export const PROFESSIONS: Record<HelperKind, Profession> = {
  ai: { mayAdvise: false, requires: null, operated: true },
  assistant: { mayAdvise: false, requires: null, operated: false },
  lawyer: { mayAdvise: true, requires: "bar_admission", operated: false },
};

/** Languages a helper may list: the ones a letter can be translated into. A closed list, so a filter means something. */
export const HELPER_LANGUAGES = TRANSLATION_LANGUAGES;

/** Areas of law a helper may list. Closed for the same reason; "other" is the escape. */
export const HELPER_AREAS = [
  "tenancy",
  "employment",
  "migration",
  "family",
  "debt",
  "social",
  "tax",
  "company",
  "contracts",
  "criminal",
  "administrative",
  "other",
] as const;
export type HelperArea = (typeof HELPER_AREAS)[number];

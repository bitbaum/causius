/**
 * Every internal href, once. Fleet nav contract rule 6: an internal link that
 * is typed out in a component is a link nobody finds when the route moves.
 */
export const ROUTES = {
  home: "/",
  matters: "/matters",
  matterById: (id: string) => `/matters/${id}`,
  cases: "/cases",
  newCase: "/cases/new",
  sampleCase: "/cases/sample",
  caseById: (id: string) => `/cases/${id}`,
  helpers: "/helpers",
  helperById: (id: string) => `/helpers/${id}`,
  helperDesk: "/helper",
  review: "/review",
  verify: "/verify",
  settings: "/settings",
  ownModel: "/settings#ai",
  platform: "/platform",
  security: "/security",
  ecosystem: "/ecosystem",
  account: "/account",
  signIn: "/sign-in",
  signUp: "/sign-up",
  authError: "/auth/error",
  roadmap: "/roadmap",
  changelog: "/changelog",
} as const;

/**
 * Where to go after signing in. Anything that is not a path on this site goes
 * to the matters page: a sign-in link must never be an open redirect.
 */
export function safeNext(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return ROUTES.matters;
  }
  return value;
}

export const API = {
  analyze: "/api/analyze",
  modelCheck: "/api/model/check",
  health: "/api/health",
  matters: "/api/matters",
  matter: (id: string) => `/api/matters/${id}`,
  matterMessages: (id: string) => `/api/matters/${id}/messages`,
  transcribe: "/api/transcribe",
  models: "/api/models",
  matterPages: (id: string) => `/api/matters/${id}/pages`,
  matterDocuments: (id: string) => `/api/matters/${id}/documents`,
  matterDocument: (id: string, doc: string) => `/api/matters/${id}/documents/${doc}`,
  matterItem: (id: string, item: string) => `/api/matters/${id}/items/${item}`,
  matterApproval: (id: string, approval: string) => `/api/matters/${id}/approvals/${approval}`,
  matterEngagements: (id: string) => `/api/matters/${id}/engagements`,
  matterEngagement: (id: string, engagement: string) => `/api/matters/${id}/engagements/${engagement}`,
  matterLeave: (id: string) => `/api/matters/${id}/leave`,
  helpers: "/api/helpers",
  helper: "/api/helper",
  helperCredentials: "/api/helper/credentials",
  helperCredential: (id: string) => `/api/helper/credentials/${id}`,
  helperRequests: "/api/helper/requests",
  helperRequest: (id: string) => `/api/helper/requests/${id}`,
  review: "/api/review",
  reviewDecision: (id: string) => `/api/review/${id}`,
  verify: "/api/credentials/verify",
  jwks: "/.well-known/jwks.json",
} as const;

/** The three planes this product sits on, and its own repository. */
export const EXTERNAL = {
  repo: "https://github.com/bitbaum/causius",
  orangecat: "https://orangecat.ch",
  orangecatOfferService: "https://orangecat.ch/dashboard/services/create",
  loki: "https://loki.orangecat.ch",
  solon: "https://solon.orangecat.ch",
  license: "https://github.com/bitbaum/causius/blob/main/LICENSE",
} as const;

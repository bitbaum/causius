import { clientIp, slidingWindow, toHeaders } from "limitkit";

/**
 * Rate limits, as limitkit decisions. In-memory and per process, which is the
 * right size for blunting scripted abuse of a free tier on one box and the
 * wrong size for billing — nothing here is billing.
 *
 * The free analysis is the scarce thing: it draws on a daily budget shared by
 * every visitor, so one caller may not drain it. A reader on their own key
 * spends their own budget and gets a much wider window.
 */
export const limits = {
  analyzeFree: slidingWindow({ limit: 8, windowMs: 60 * 60_000 }),
  analyzeOwn: slidingWindow({ limit: 60, windowMs: 60 * 60_000 }),
  modelCheck: slidingWindow({ limit: 30, windowMs: 10 * 60_000 }),
  // Keyed by actor, not IP: a signed-in person's budget follows them.
  turnFree: slidingWindow({ limit: 30, windowMs: 60 * 60_000 }),
  turnOwn: slidingWindow({ limit: 200, windowMs: 60 * 60_000 }),
  matterCreate: slidingWindow({ limit: 20, windowMs: 60 * 60_000 }),
  upload: slidingWindow({ limit: 60, windowMs: 60 * 60_000 }),
  // A spoken take or a photographed page each cost a model call on the shared free tier.
  transcribe: slidingWindow({ limit: 40, windowMs: 10 * 60_000 }),
  pages: slidingWindow({ limit: 20, windowMs: 60 * 60_000 }),
  // Profiles, credentials and requests to helpers: people writing, not a model.
  helperWrite: slidingWindow({ limit: 60, windowMs: 60 * 60_000 }),
  engage: slidingWindow({ limit: 20, windowMs: 60 * 60_000 }),
  // Anyone may check an attestation; a script may not hammer it.
  verify: slidingWindow({ limit: 60, windowMs: 10 * 60_000 }),
};

export function callerKey(request: Request, scope: string): string {
  return `${scope}:${clientIp(request.headers)}`;
}

export function tooMany(result: Parameters<typeof toHeaders>[0]): Response {
  return Response.json({ error: "rate_limited" }, { status: 429, headers: toHeaders(result) });
}

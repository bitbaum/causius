/** One JSON call for the helper screens: the body, or the error code the route answered with. */
export async function call<T>(url: string, init?: { method?: string; body?: unknown }): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const r = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.body === undefined ? undefined : { "content-type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const body = (await r.json().catch(() => ({}))) as T & { error?: string };
    return r.ok ? { ok: true, data: body } : { ok: false, error: body.error ?? "unknown" };
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export const KNOWN_ERRORS = [
  "bad_request",
  "already_submitted",
  "not_needed",
  "no_profile",
  "needs_verification",
  "already_answered",
  "rate_limited",
  "not_configured",
] as const;

export const errorKey = (code: string) => `errors.${(KNOWN_ERRORS as readonly string[]).includes(code) ? code : "unknown"}`;

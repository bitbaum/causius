import { getTranslations } from "next-intl/server";
import { localeEnglishNames, toLocale } from "@/i18n/routing";
import { callerKey, limits, tooMany } from "@/lib/limits";
import { body, context, json } from "@/lib/matters/http";
import { ReviewInput, runReview } from "@/lib/matters/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// One model call per document.
export const maxDuration = 300;

const STATUS = { not_found: 404, not_allowed: 403, no_documents: 409, not_configured: 503, bad_own_model: 400, busy: 503 } as const;

/** POST /api/matters/:id/review — the same questions of every document; a table back, kept in the matter. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const parsed = ReviewInput.safeParse(await body(request));
  if (!parsed.success) return json({ error: "bad_request" }, 400);
  const own = parsed.data.byok !== undefined && parsed.data.byok !== null;
  // A review costs as much as an agent turn, and shares its budget.
  const allowed = (own ? limits.turnOwn : limits.turnFree).check(callerKey(request, `turn:${ctx.sub}`));
  if (!allowed.allowed) return tooMany(allowed);

  const locale = toLocale(parsed.data.locale ?? "en");
  const t = await getTranslations({ locale, namespace: "DocReview" });
  const outcome = await runReview({
    db: ctx.db,
    master: ctx.master,
    matterId: (await params).id,
    sub: ctx.sub,
    questions: parsed.data.questions,
    byok: parsed.data.byok,
    language: localeEnglishNames[locale],
    notFound: t("notFound"),
    title: t("savedTitle"),
    env: process.env,
    signal: request.signal,
  });
  return outcome.ok ? json({ table: outcome.table }) : json({ error: outcome.error }, STATUS[outcome.error]);
}

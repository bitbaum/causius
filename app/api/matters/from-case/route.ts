import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { locales, toLocale } from "@/i18n/routing";
import { parseCase } from "@/lib/case";
import { callerKey, limits, tooMany } from "@/lib/limits";
import { matterFromCase } from "@/lib/matters/from-case";
import { body, context, guarded, json } from "@/lib/matters/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Input = z.object({ case: z.unknown(), locale: z.enum(locales).optional() });

/** POST /api/matters/from-case — a quick check from the browser, opened as a sealed matter. */
export async function POST(request: Request) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const allowed = limits.matterCreate.check(callerKey(request, `matter-create:${ctx.sub}`));
  if (!allowed.allowed) return tooMany(allowed);
  const parsed = Input.safeParse(await body(request));
  const data = parsed.success ? parseCase(parsed.data.case) : null;
  if (!parsed.success || !data) return json({ error: "bad_request" }, 400);
  const t = await getTranslations({ locale: toLocale(parsed.data.locale ?? "en"), namespace: "MatterFromCase" });
  return guarded(async () => {
    const id = await matterFromCase(ctx.db, ctx.master, {
      sub: ctx.sub,
      accountName: ctx.name,
      data,
      words: { deadline: t("deadline"), letter: t("letter"), reply: t("reply") },
    });
    return json({ id }, 201);
  });
}

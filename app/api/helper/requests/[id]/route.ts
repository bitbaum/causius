import { z } from "zod";
import { answerRequest } from "@/lib/helpers/engagements";
import { body, context, guarded, json } from "@/lib/matters/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Answer = z.object({ answer: z.enum(["accept", "decline"]) });

/** POST /api/helper/requests/:id — accept (join the matter) or decline. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const parsed = Answer.safeParse(await body(request));
  if (!parsed.success) return json({ error: "bad_request" }, 400);
  const id = (await params).id;
  return guarded(async () => {
    const matterId = await answerRequest(ctx.db, ctx.master, ctx.sub, id, parsed.data.answer);
    return matterId ? json({ matterId }) : json({ error: "not_found" }, 404);
  });
}

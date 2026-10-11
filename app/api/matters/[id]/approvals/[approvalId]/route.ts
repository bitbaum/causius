import { z } from "zod";
import { body, context, guarded, json } from "@/lib/matters/http";
import { appendMessage, decideApproval, openMatter } from "@/lib/matters/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Decide = z.object({ decision: z.enum(["approved", "rejected"]) });

/**
 * POST /api/matters/:id/approvals/:approvalId — the owner decides.
 *
 * Approving records the decision; it does not yet carry the action out —
 * sending and filing are done by the person with the approved document, and
 * the page says so. The decision is written into the matter so the agent
 * knows it on the next turn.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; approvalId: string }> }) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const parsed = Decide.safeParse(await body(request));
  const { id, approvalId } = await params;
  if (!parsed.success || !z.uuid().safeParse(approvalId).success) return json({ error: "bad_request" }, 400);
  const m = await openMatter(ctx.db, ctx.master, id, ctx.sub);
  if (!m) return json({ error: "not_found" }, 404);
  return guarded(async () => {
    const changed = await decideApproval(ctx.db, m, approvalId, parsed.data.decision, ctx.sub);
    if (!changed) return json({ error: "already_decided" }, 409);
    await appendMessage(ctx.db, m, {
      actor: ctx.sub,
      role: "user",
      text: parsed.data.decision === "approved" ? "(I approved the proposed action.)" : "(I declined the proposed action.)",
    });
    return json({ ok: true });
  });
}

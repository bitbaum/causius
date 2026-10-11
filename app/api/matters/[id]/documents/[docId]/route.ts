import { context, json } from "@/lib/matters/http";
import { openMatter, readDocument } from "@/lib/matters/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/matters/:id/documents/:docId — the document's text, as a download. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const { id, docId } = await params;
  const m = await openMatter(ctx.db, ctx.master, id, ctx.sub);
  if (!m) return json({ error: "not_found" }, 404);
  const doc = await readDocument(ctx.db, m, docId);
  if (!doc) return json({ error: "not_found" }, 404);
  const base = doc.meta.name.replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 100) || "document";
  const name = /\.(md|txt)$/i.test(base) ? base : `${base}${doc.meta.mime === "text/markdown" ? ".md" : ".txt"}`;
  return new Response(doc.text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}

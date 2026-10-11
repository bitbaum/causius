import { extractText, getDocumentProxy } from "unpdf";
import { callerKey, limits, tooMany } from "@/lib/limits";
import { context, guarded, json } from "@/lib/matters/http";
import { addDocument, openMatter } from "@/lib/matters/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const TEXT_TYPES = new Set(["text/plain", "text/markdown", ""]);

/**
 * POST /api/matters/:id/documents — add a document (multipart, field `file`).
 *
 * Text and PDF. The text is extracted here and the file itself is not kept:
 * what the agent works with is the text, sealed under the matter's key, and
 * an original kept on a server is one more copy of someone's paperwork to
 * leak. The person keeps their original.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const allowed = limits.upload.check(callerKey(request, `upload:${ctx.sub}`));
  if (!allowed.allowed) return tooMany(allowed);
  const m = await openMatter(ctx.db, ctx.master, (await params).id, ctx.sub);
  if (!m) return json({ error: "not_found" }, 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "bad_request" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "too_large" }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf = file.type === "application/pdf" || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);
  let text: string;
  if (isPdf) {
    try {
      const pdf = await getDocumentProxy(bytes);
      const out = await extractText(pdf, { mergePages: true });
      text = String(out.text).trim();
    } catch {
      return json({ error: "unreadable" }, 422);
    }
    if (!text) return json({ error: "scanned_pdf" }, 422);
  } else if (TEXT_TYPES.has(file.type) || /\.(txt|md)$/i.test(file.name)) {
    text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } else {
    return json({ error: "unsupported_type" }, 415);
  }

  return guarded(async () => {
    const id = await addDocument(ctx.db, m, {
      name: file.name || "Document",
      mime: isPdf ? "application/pdf" : "text/plain",
      origin: "upload",
      text,
      bySub: ctx.sub,
    });
    return json({ id }, 201);
  });
}

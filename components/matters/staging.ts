import type { ByokConfig } from "@bitbaum/ai-kit/byok";
import { API } from "@/lib/routes";

/** Something the person attached and has not sent yet. */
export type Staged =
  | { kind: "page"; id: string; name: string; mediaType: "image/jpeg"; data: string; covered: number }
  | { kind: "file"; id: string; name: string; file: File };

/** Which model answers, as the request bodies carry it. */
export type ModelChoice = { byok?: ByokConfig; model?: string };

/** The errors an upload can end in, as the Chat messages name them. */
export const UPLOAD_ERRORS: Record<string, string> = {
  scanned_pdf: "errScanned",
  no_vision: "errNoVision",
  unreadable: "errUnreadable",
  too_large: "errTooLarge",
  unsupported_type: "errUnsupported",
  rate_limited: "errRate",
};

/**
 * Put what was attached into the matter, as documents. Photographed pages go
 * together as one document (a letter's pages belong in order); each file is its
 * own. Returns the error code of the first failure, or null.
 */
export async function uploadStaged(
  matterId: string,
  staged: Staged[],
  choice: ModelChoice,
  signal?: AbortSignal,
): Promise<string | null> {
  const pages = staged.filter((s): s is Extract<Staged, { kind: "page" }> => s.kind === "page");
  if (pages.length) {
    const r = await fetch(API.matterPages(matterId), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        images: pages.map((p) => ({ mediaType: p.mediaType, data: p.data })),
        byok: choice.byok,
        model: choice.byok ? undefined : choice.model,
      }),
      signal,
    });
    if (!r.ok) return ((await r.json().catch(() => ({}))) as { error?: string }).error ?? "upload";
  }
  for (const item of staged) {
    if (item.kind !== "file") continue;
    const form = new FormData();
    form.set("file", item.file);
    const r = await fetch(API.matterDocuments(matterId), { method: "POST", body: form, signal });
    if (!r.ok) return ((await r.json().catch(() => ({}))) as { error?: string }).error ?? "upload";
  }
  return null;
}

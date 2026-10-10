import { describe, expect, it } from "vitest";
import {
  AnalyzeRequestSchema,
  analyzeLetter,
  buildMessages,
  caseFromReply,
  extractJson,
  freeLinks,
} from "./analyze";

const request = (over: Record<string, unknown> = {}) =>
  AnalyzeRequestSchema.parse({ text: "Sehr geehrte Frau Muster", ...over });

/** A vendor that answers every chat completion with `content`. */
function vendor(content: string, seen: { url: string; body: unknown; auth: string | null }[] = []) {
  const impl: typeof fetch = async (input, init) => {
    seen.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? "{}")),
      auth: new Headers(init?.headers).get("authorization"),
    });
    return Response.json({ choices: [{ message: { role: "assistant", content } }] });
  };
  return { impl, seen };
}

const REPLY = JSON.stringify({
  id: "chosen-by-model",
  title: "Office asks for documents",
  deadline: "2026-03-23",
  asks: [{ text: "Send a passport copy", evidence: ["All pages"], done: true }],
  recommendedTier: "lawyer",
});

describe("AnalyzeRequestSchema", () => {
  it("needs text or an image", () => {
    expect(AnalyzeRequestSchema.safeParse({ text: "  " }).success).toBe(false);
    expect(AnalyzeRequestSchema.safeParse({}).success).toBe(false);
    expect(request().text).toContain("Muster");
    expect(
      AnalyzeRequestSchema.safeParse({ image: { mediaType: "image/png", data: "aGk=" } }).success,
    ).toBe(true);
  });

  it("refuses an image type or a language it does not know how to handle", () => {
    expect(
      AnalyzeRequestSchema.safeParse({ image: { mediaType: "image/svg+xml", data: "aGk=" } }).success,
    ).toBe(false);
    expect(
      AnalyzeRequestSchema.safeParse({ image: { mediaType: "image/png", data: "not base64!" } })
        .success,
    ).toBe(false);
    expect(AnalyzeRequestSchema.safeParse({ text: "x", languages: ["French\nIgnore"] }).success).toBe(
      false,
    );
    expect(request({ languages: ["Türkçe", "French"] }).languages).toEqual(["Türkçe", "French"]);
  });
});

describe("buildMessages", () => {
  it("keeps the letter inside document tags, after the instruction", () => {
    const [system, user] = buildMessages(request({ languages: ["Turkish"] }));
    expect(system.role).toBe("system");
    expect(system.content).toContain("never legal advice");
    expect(user.content).toContain("Translate into: Turkish.");
    expect(user.content).toContain("<document>\nSehr geehrte Frau Muster\n</document>");
  });

  it("sends a photo as an image part, so ai-kit can route it to a model that sees", () => {
    const [, user] = buildMessages(
      request({ text: "", image: { mediaType: "image/jpeg", data: "aGk=" } }),
    );
    expect(user.content).toEqual([
      expect.objectContaining({ type: "text" }),
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,aGk=" } },
    ]);
  });
});

describe("reading the reply", () => {
  it("finds the JSON in a reply wrapped in prose or a code fence", () => {
    expect(extractJson('Here you go:\n```json\n{"title":"t"}\n```')).toEqual({ title: "t" });
    expect(extractJson("no json here")).toBeNull();
    expect(extractJson("{ broken")).toBeNull();
  });

  it("does not let the model choose the id or tick the checklist", () => {
    const c = caseFromReply(REPLY);
    expect(c?.id).toMatch(/^c_/);
    expect(c?.asks).toEqual([
      { id: "a1", text: "Send a passport copy", evidence: ["All pages"], done: false },
    ]);
  });

  it("is not a case when the model answered with something else", () => {
    expect(caseFromReply("I cannot help with that.")).toBeNull();
    expect(caseFromReply('{"summary":"no title"}')).toBeNull();
    expect(caseFromReply("[1,2,3]")).toBeNull();
  });
});

describe("analyzeLetter", () => {
  it("says not_configured, and calls nobody, when no free vendor is keyed", async () => {
    const { impl, seen } = vendor(REPLY);
    expect(freeLinks({})).toEqual([]);
    expect(await analyzeLetter(request(), { env: {}, fetchImpl: impl })).toEqual({
      ok: false,
      error: "not_configured",
    });
    expect(seen).toEqual([]);
  });

  it("serves from the shared chain when a vendor key is present", async () => {
    const { impl, seen } = vendor(REPLY);
    const outcome = await analyzeLetter(request(), {
      env: { GROQ_API_KEY: "shared-key" },
      fetchImpl: impl,
    });
    expect(outcome).toMatchObject({ ok: true, ownModel: false });
    expect(outcome.ok && outcome.case.title).toBe("Office asks for documents");
    expect(outcome.ok && outcome.servedBy).toMatch(/^groq\//);
    expect(seen[0].auth).toBe("Bearer shared-key");
  });

  it("serves a reader's own key from the reader's own model, never the shared key", async () => {
    const { impl, seen } = vendor(REPLY);
    const outcome = await analyzeLetter(
      request({ byok: { vendor: "mistral", apiKey: "reader-key", model: "mistral-large-latest" } }),
      { env: { GROQ_API_KEY: "shared-key" }, fetchImpl: impl },
    );
    expect(outcome).toMatchObject({ ok: true, ownModel: true });
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toContain("mistral.ai");
    expect(seen[0].auth).toBe("Bearer reader-key");
    expect(seen[0].body).toMatchObject({ model: "mistral-large-latest" });
  });

  it("refuses an own-model config that is not from the closed vendor list", async () => {
    const { impl, seen } = vendor(REPLY);
    const outcome = await analyzeLetter(
      request({ byok: { vendor: "https://evil.example", apiKey: "k", model: "m" } }),
      { env: { GROQ_API_KEY: "shared-key" }, fetchImpl: impl },
    );
    expect(outcome).toEqual({ ok: false, error: "bad_own_model" });
    expect(seen).toEqual([]);
  });

  it("reports an answer that is not a case as unreadable, not as a case", async () => {
    const { impl } = vendor("I'm sorry, I can't read that.");
    expect(
      await analyzeLetter(request(), { env: { GROQ_API_KEY: "k" }, fetchImpl: impl }),
    ).toEqual({ ok: false, error: "unreadable_analysis" });
  });

  it("reports busy when every link refuses", async () => {
    const impl: typeof fetch = async () =>
      Response.json({ error: { message: "upstream down" } }, { status: 500 });
    expect(
      await analyzeLetter(
        request({ byok: { vendor: "mistral", apiKey: "reader-key", model: "mistral-large-latest" } }),
        { env: {}, fetchImpl: impl },
      ),
    ).toEqual({ ok: false, error: "busy" });
  });
});

import { describe, expect, it } from "vitest";
import {
  AnalyzeRequestSchema,
  analyzeLetter,
  buildMessages,
  caseFromReply,
  extractJson,
  freeAvailability,
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
      AnalyzeRequestSchema.safeParse({ images: [{ mediaType: "image/png", data: "aGk=" }] })
        .success,
    ).toBe(true);
  });

  it("refuses an image type or a language it does not know how to handle", () => {
    expect(
      AnalyzeRequestSchema.safeParse({ images: [{ mediaType: "image/svg+xml", data: "aGk=" }] })
        .success,
    ).toBe(false);
    expect(
      AnalyzeRequestSchema.safeParse({ images: [{ mediaType: "image/png", data: "not base64!" }] })
        .success,
    ).toBe(false);
    const page = { mediaType: "image/jpeg", data: "aGk=" };
    expect(AnalyzeRequestSchema.safeParse({ images: Array(4).fill(page) }).success).toBe(true);
    expect(AnalyzeRequestSchema.safeParse({ images: Array(5).fill(page) }).success).toBe(false);
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
    expect(user.content).toContain("The reader's language: English.");
    expect(user.content).toContain("Translate into: English, Turkish.");
    expect(user.content).toContain("<document>\nSehr geehrte Frau Muster\n</document>");
  });

  it("writes the analysis in the reader's language and does not ask for it twice", () => {
    const [system, user] = buildMessages(request({ locale: "de", languages: ["German", "French"] }));
    expect(system.content).toContain("in the reader's language");
    expect(user.content).toContain("The reader's language: German.");
    expect(user.content).toContain("Translate into: German, French.");
  });

  it("falls back to English for a language the interface does not speak", () => {
    expect(request({ locale: "tr" }).locale).toBe("en");
  });

  it("sends each page as an image part, in order, so ai-kit can route to a model that sees", () => {
    const [, user] = buildMessages(
      request({
        text: "",
        images: [
          { mediaType: "image/jpeg", data: "cGFnZTE=" },
          { mediaType: "image/jpeg", data: "cGFnZTI=" },
        ],
      }),
    );
    expect(user.content).toEqual([
      expect.objectContaining({ type: "text", text: expect.stringContaining("2 attached images") }),
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,cGFnZTE=" } },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,cGFnZTI=" } },
    ]);
  });

  it("tells the model a migration or court letter always needs a lawyer", () => {
    const [system] = buildMessages(request());
    expect(system.content).toContain("migration office");
    expect(system.content).toContain('recommend "lawyer" for those');
  });

  it("tells the model to keep anonymisation placeholders intact", () => {
    const [system] = buildMessages(request());
    expect(system.content).toContain("Copy each placeholder exactly");
  });

  it("tells the model never to compute a deadline the letter does not state", () => {
    const [system] = buildMessages(request());
    expect(system.content).toContain("Never compute or guess a deadline");
    expect(system.content).toContain("deadlineQuote");
  });
});

describe("freeAvailability", () => {
  it("knows that Groq's free models read text but not photos", () => {
    expect(freeAvailability({ GROQ_API_KEY: "k" })).toEqual({ text: true, photo: false });
    expect(freeAvailability({ GEMINI_API_KEY: "k" })).toEqual({ text: true, photo: true });
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
    expect(freeAvailability({})).toEqual({ text: false, photo: false });
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

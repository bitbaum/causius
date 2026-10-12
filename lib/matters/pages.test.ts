import { describe, expect, it } from "vitest";
import { freeLinksFor, offeredModels } from "../analyze";
import { SECURITY_HEADERS } from "../security";
import { PagesRequestSchema, transcribePages } from "./pages";

const ENV = { GROQ_API_KEY: "shared-key", CAUSIUS_GROQ_MODELS: "meta-llama/llama-4-scout-17b-16e-instruct" };
const PIXEL = "iVBORw0KGgo=";

function reply(text: string) {
  const seen: string[] = [];
  const impl: typeof fetch = async (_url, init) => {
    seen.push(String(init?.body ?? ""));
    return Response.json({ choices: [{ message: { role: "assistant", content: text }, finish_reason: "stop" }] });
  };
  return { impl, seen };
}

describe("photographed pages", () => {
  it("reads covered pages into text and sends the pictures as pictures", async () => {
    const model = reply("Sehr geehrte Damen und Herren [covered]");
    const request = PagesRequestSchema.parse({ images: [{ mediaType: "image/jpeg", data: PIXEL }] });
    const out = await transcribePages(request, { env: ENV, fetchImpl: model.impl });
    expect(out).toMatchObject({ ok: true, text: "Sehr geehrte Damen und Herren [covered]", own: false });
    expect(model.seen[0]).toContain("image_url");
  });

  it("reports an empty answer as busy, and a missing key as not configured", async () => {
    const request = PagesRequestSchema.parse({ images: [{ mediaType: "image/jpeg", data: PIXEL }] });
    expect(await transcribePages(request, { env: ENV, fetchImpl: reply("   ").impl })).toEqual({ ok: false, error: "busy" });
    expect(await transcribePages(request, { env: {}, fetchImpl: reply("x").impl })).toEqual({ ok: false, error: "not_configured" });
  });

  it("refuses an own model that is not on ai-kit's list", async () => {
    const request = PagesRequestSchema.parse({ images: [{ mediaType: "image/jpeg", data: PIXEL }], byok: { vendor: "evil" } });
    expect(await transcribePages(request, { env: ENV, fetchImpl: reply("x").impl })).toEqual({ ok: false, error: "bad_own_model" });
  });

  it("bounds what a request may carry", () => {
    const page = { mediaType: "image/jpeg", data: PIXEL };
    expect(PagesRequestSchema.safeParse({ images: [] }).success).toBe(false);
    expect(PagesRequestSchema.safeParse({ images: Array(5).fill(page) }).success).toBe(false);
    expect(PagesRequestSchema.safeParse({ images: [{ mediaType: "image/gif", data: PIXEL }] }).success).toBe(false);
    expect(PagesRequestSchema.safeParse({ images: [{ mediaType: "image/jpeg", data: "not base64!" }] }).success).toBe(false);
  });
});

describe("the model pick", () => {
  it("starts the chain at an offered model and ignores one that is not offered", () => {
    const offered = offeredModels(ENV).map((m) => m.id);
    expect(offered.length).toBeGreaterThan(0);
    expect(freeLinksFor(ENV, offered[0])[0]?.model).toBe(offered[0]);
    expect(freeLinksFor(ENV, "../../etc/passwd")).toEqual(freeLinksFor(ENV));
  });
});

describe("the browser policy", () => {
  it("lets this origin use the microphone and nothing else the camera", () => {
    const policy = SECURITY_HEADERS.find((h) => h.key === "Permissions-Policy")!.value;
    expect(policy).toContain("microphone=(self)");
    expect(policy).toContain("camera=()");
  });
});

import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  masterKey,
  matterSealer,
  newMatterKey,
  openBytes,
  openJson,
  openMatterKey,
  SealError,
  sealBytes,
  sealJson,
} from "./crypto";

const key = randomBytes(32);

describe("sealing", () => {
  it("round-trips, and two seals of the same value differ", () => {
    const a = sealJson(key, { title: "Steuerrekurs" }, "m:core");
    const b = sealJson(key, { title: "Steuerrekurs" }, "m:core");
    expect(a).not.toBe(b);
    expect(openJson(key, a, "m:core")).toEqual({ title: "Steuerrekurs" });
  });

  it("leaks nothing of the plaintext", () => {
    const sealed = sealJson(key, { title: "Erika Muster divorce" }, "m:core");
    expect(sealed).not.toMatch(/Erika|Muster|divorce/);
    expect(sealed.startsWith("v1.")).toBe(true);
  });

  it("refuses the wrong key, the wrong place and any tampering", () => {
    const sealed = sealBytes(key, Buffer.from("secret"), "m1:document-text");
    expect(() => openBytes(randomBytes(32), sealed, "m1:document-text")).toThrow(SealError);
    expect(() => openBytes(key, sealed, "m2:document-text")).toThrow(SealError);
    expect(() => openBytes(key, sealed, "m1:core")).toThrow(SealError);
    const parts = sealed.split(".");
    const ct = Buffer.from(parts[2]!, "base64url");
    ct[0] = ct[0]! ^ 1;
    parts[2] = ct.toString("base64url");
    expect(() => openBytes(key, parts.join("."), "m1:document-text")).toThrow(SealError);
    expect(() => openBytes(key, "plain text", "m1:document-text")).toThrow(SealError);
  });

  it("refuses keys that are not 32 bytes", () => {
    expect(() => sealBytes(Buffer.alloc(16), Buffer.from("x"), "c")).toThrow(SealError);
  });
});

describe("matter keys", () => {
  it("are sealed with the master key and bound to their matter", () => {
    const master = randomBytes(32);
    const { key: k, sealed } = newMatterKey(master, "matter-a");
    expect(openMatterKey(master, sealed, "matter-a").equals(k)).toBe(true);
    expect(() => openMatterKey(master, sealed, "matter-b")).toThrow(SealError);
  });

  it("bind each field to its purpose", () => {
    const s = matterSealer(key, "matter-a");
    const title = s.seal("core", { title: "t" });
    expect(s.open("core", title)).toEqual({ title: "t" });
    expect(() => s.open("event", title)).toThrow(SealError);
    expect(() => matterSealer(key, "matter-b").open("core", title)).toThrow(SealError);
  });
});

describe("the master key", () => {
  it("is required, and must be 32 bytes", () => {
    expect(() => masterKey({})).toThrow(/not set/);
    expect(() => masterKey({ CAUSIUS_MASTER_KEY: Buffer.alloc(16).toString("base64") })).toThrow(/32 bytes/);
    expect(masterKey({ CAUSIUS_MASTER_KEY: Buffer.alloc(32, 1).toString("base64") })).toHaveLength(32);
  });
});

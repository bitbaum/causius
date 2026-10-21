import { createPublicKey, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MASTER } from "../test/db";
import { issueAttestation, issuerKey, jwks, verifyAttestation } from "./attest";

const CLAIM = {
  credentialId: "11111111-1111-4111-8111-111111111111",
  helperId: "22222222-2222-4222-8222-222222222222",
  jurisdiction: "CH-ZH",
  legalName: "Anna Beispiel",
  registerNumber: "ZH-0000",
};

describe("attestations", () => {
  it("derives one stable key from the master key, and a different one from another", () => {
    expect(issuerKey(MASTER).kid).toBe(issuerKey(MASTER).kid);
    expect(issuerKey(Buffer.alloc(32, 9)).kid).not.toBe(issuerKey(MASTER).kid);
  });

  it("keeps the name and register number out of the public token", () => {
    const { token } = issueAttestation(MASTER, CLAIM);
    const payload = Buffer.from(token.split(".")[1]!, "base64url").toString();
    expect(payload).not.toContain("Anna");
    expect(payload).not.toContain("ZH-0000");
    expect(payload).toContain('"jurisdiction":"CH-ZH"');
    expect(token.endsWith("~")).toBe(true);
  });

  it("verifies with nothing but the published key (any EdDSA library can)", () => {
    const { token } = issueAttestation(MASTER, CLAIM);
    const [h, p, s] = token.replace(/~$/, "").split(".") as [string, string, string];
    const key = createPublicKey({ key: jwks(MASTER).keys[0]!, format: "jwk" });
    expect(verify(null, Buffer.from(`${h}.${p}`), key, Buffer.from(s, "base64url"))).toBe(true);
  });

  it("reveals the name only to whoever holds the disclosures", () => {
    const att = issueAttestation(MASTER, CLAIM);
    const anon = verifyAttestation(MASTER, att.token);
    expect(anon).toMatchObject({ ok: true, jurisdiction: "CH-ZH", disclosed: {} });
    const told = verifyAttestation(MASTER, att.token, att.disclosures);
    expect(told).toMatchObject({ ok: true, disclosed: { legal_name: "Anna Beispiel", register_number: "ZH-0000" } });
  });

  it("refuses a name Causius did not verify, even under a valid signature", () => {
    const att = issueAttestation(MASTER, CLAIM);
    const other = issueAttestation(MASTER, { ...CLAIM, legalName: "Someone Else" });
    expect(verifyAttestation(MASTER, att.token, [other.disclosures[0]!])).toEqual({ ok: false, reason: "bad_disclosure" });
    const forged = Buffer.from(JSON.stringify(["salt", "legal_name", "Someone Else"])).toString("base64url");
    expect(verifyAttestation(MASTER, att.token, [forged])).toEqual({ ok: false, reason: "bad_disclosure" });
  });

  it("refuses a changed payload, another issuer's key and an expired token", () => {
    const { token } = issueAttestation(MASTER, CLAIM);
    const [h, p, s] = token.replace(/~$/, "").split(".") as [string, string, string];
    const body = JSON.parse(Buffer.from(p, "base64url").toString());
    const moved = Buffer.from(JSON.stringify({ ...body, jurisdiction: "DE" })).toString("base64url");
    expect(verifyAttestation(MASTER, `${h}.${moved}.${s}~`)).toEqual({ ok: false, reason: "bad_signature" });
    expect(verifyAttestation(Buffer.alloc(32, 9), token)).toEqual({ ok: false, reason: "unknown_key" });
    const later = new Date(Date.now() + 400 * 86_400_000);
    expect(verifyAttestation(MASTER, token, [], later)).toEqual({ ok: false, reason: "expired" });
    expect(verifyAttestation(MASTER, "not a token")).toEqual({ ok: false, reason: "malformed" });
  });

  it("salts each disclosure, so the same name never gives the same digest twice", () => {
    const a = issueAttestation(MASTER, CLAIM);
    const b = issueAttestation(MASTER, CLAIM);
    expect(a.token.split(".")[1]).not.toBe(b.token.split(".")[1]);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { credentials } from "../db/schema";
import { addDocument, appendMessage, createMatter, listMatters, loadMatter, NotAllowed, openMatter, readDocument } from "../matters/store";
import { MASTER, testDb } from "../test/db";
import { verifyAttestation } from "./attest";
import { answerRequest, endEngagement, helperRequests, leaveMatter, matterEngagements, requestHelp } from "./engagements";
import {
  credentialStatus,
  directory,
  ownHelper,
  publicHelper,
  Refused,
  reviewCredential,
  reviewQueue,
  saveHelper,
  submitCredential,
  withdrawCredential,
} from "./store";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

let n = 0;
const someone = (who: string) => `${who}-${++n}`;

const LAWYER = {
  kind: "lawyer" as const,
  name: "Advocata Nord",
  headline: "Tenancy and employment",
  jurisdictions: ["CH-ZH", "CH-BE"],
  languages: ["de", "en"] as ("de" | "en")[],
  areas: ["tenancy"] as "tenancy"[],
  status: "listed" as const,
};
const EVIDENCE = {
  jurisdiction: "CH-ZH",
  legalName: "Anna Beispiel",
  registerNumber: "ZH-0000",
  registerUrl: "https://register.example/anna",
};

async function verifiedLawyer() {
  const sub = someone("lawyer");
  const id = await saveHelper(db, sub, LAWYER);
  const credentialId = await submitCredential(db, MASTER, sub, EVIDENCE);
  await reviewCredential(db, MASTER, someone("reviewer"), credentialId, { action: "verify" });
  return { sub, id, credentialId };
}

async function clientMatter() {
  const owner = someone("client");
  const matterId = await createMatter(db, MASTER, {
    ownerSub: owner,
    core: { title: "Erika Muster rent increase", summary: "", area: "Tenancy", facts: ["Erika Muster lives at Musterweg 1"], hide: ["Erika Muster"] },
    jurisdiction: "CH-ZH",
  });
  const m = (await openMatter(db, MASTER, matterId, owner))!;
  return { owner, matterId, m };
}

describe("profiles", () => {
  it("keeps an assistant out of the directory until listed with a language", async () => {
    const sub = someone("assistant");
    const id = await saveHelper(db, sub, { kind: "assistant", name: "Paperwork Pia", status: "draft" });
    expect(await publicHelper(db, id)).toBeNull();
    await saveHelper(db, sub, { kind: "assistant", name: "Paperwork Pia", status: "listed" });
    expect((await ownHelper(db, sub))!.waitingFor).toBe("language");
    await saveHelper(db, sub, { kind: "assistant", name: "Paperwork Pia", status: "listed", languages: ["de"], jurisdictions: ["CH"] });
    expect(await publicHelper(db, id)).toMatchObject({ name: "Paperwork Pia", jurisdictions: ["CH"] });
    expect((await directory(db)).map((h) => h.id)).toContain(id);
  });

  it("lists a lawyer only once verified, and only where verified", async () => {
    const sub = someone("lawyer");
    const id = await saveHelper(db, sub, LAWYER);
    expect(await publicHelper(db, id)).toBeNull();
    expect((await ownHelper(db, sub))!.waitingFor).toBe("verification");

    const credentialId = await submitCredential(db, MASTER, sub, EVIDENCE);
    await expect(submitCredential(db, MASTER, sub, EVIDENCE)).rejects.toThrow(Refused);
    await reviewCredential(db, MASTER, someone("reviewer"), credentialId, { action: "verify" });

    const pub = (await publicHelper(db, id))!;
    // Typed CH-ZH and CH-BE; only CH-ZH was checked.
    expect(pub.jurisdictions).toEqual(["CH-ZH"]);
    expect(JSON.stringify(pub)).not.toContain("Anna");
    const check = verifyAttestation(MASTER, pub.attestations[0]!.token);
    expect(check).toMatchObject({ ok: true, jurisdiction: "CH-ZH", subject: expect.stringContaining(id) });
  });

  it("seals the evidence: no clear column holds the legal name", async () => {
    const { credentialId } = await verifiedLawyer();
    const rows = await db.select().from(credentials);
    const row = rows.find((r) => r.id === credentialId)!;
    expect(JSON.stringify(row)).not.toContain("Anna Beispiel");
    expect(JSON.stringify(row)).not.toContain("ZH-0000");
  });

  it("does not ask an assistant for a credential", async () => {
    const sub = someone("assistant");
    await saveHelper(db, sub, { kind: "assistant", name: "Pia" });
    await expect(submitCredential(db, MASTER, sub, EVIDENCE)).rejects.toThrow("not_needed");
  });
});

describe("review", () => {
  it("shows a reviewer the evidence and refuses their own credential", async () => {
    const sub = someone("lawyer");
    await saveHelper(db, sub, LAWYER);
    const credentialId = await submitCredential(db, MASTER, sub, EVIDENCE);
    const item = (await reviewQueue(db, MASTER)).find((i) => i.id === credentialId)!;
    expect(item.evidence).toMatchObject({ legalName: "Anna Beispiel", registerUrl: "https://register.example/anna" });
    await expect(reviewCredential(db, MASTER, sub, credentialId, { action: "verify" })).rejects.toThrow("own_credential");
  });

  it("rejects with a reason, and a revoked verification leaves the directory at once", async () => {
    const sub = someone("lawyer");
    const id = await saveHelper(db, sub, LAWYER);
    const first = await submitCredential(db, MASTER, sub, EVIDENCE);
    await reviewCredential(db, MASTER, someone("reviewer"), first, { action: "reject", note: "Register entry not found" });
    expect((await ownHelper(db, sub))!.credentials[0]).toMatchObject({ status: "rejected", reviewNote: "Register entry not found" });

    const second = await submitCredential(db, MASTER, sub, EVIDENCE);
    await reviewCredential(db, MASTER, someone("reviewer"), second, { action: "verify" });
    expect(await publicHelper(db, id)).not.toBeNull();
    await reviewCredential(db, MASTER, someone("reviewer"), second, { action: "revoke" });
    expect(await publicHelper(db, id)).toBeNull();
    expect(await credentialStatus(db, second)).toBe("revoked");
  });

  it("lets a lawyer withdraw their own verification", async () => {
    const { sub, id, credentialId } = await verifiedLawyer();
    expect(await withdrawCredential(db, sub, credentialId)).toBe(true);
    expect(await publicHelper(db, id)).toBeNull();
  });
});

describe("engagements", () => {
  it("anonymises the request, and the helper's whole view, when the owner says so", async () => {
    const { id: helperId, sub: helperSub } = await verifiedLawyer();
    const { owner, matterId, m } = await clientMatter();
    await appendMessage(db, m, { actor: owner, role: "user", text: "My name is Erika Muster, reach me at erika@example.ch" });
    await addDocument(db, m, { name: "Letter to Erika Muster.txt", mime: "text/plain", origin: "upload", text: "Dear Erika Muster, the rent rises.", bySub: owner });

    await requestHelp(db, m, owner, { helperId, message: "Erika Muster here — can you look at this?" });
    const [req] = await helperRequests(db, MASTER, helperSub);
    expect(req!.request.message).not.toContain("Erika");
    expect(req!.request.title).not.toContain("Erika");

    // Not in the matter before accepting.
    expect(await loadMatter(db, MASTER, matterId, helperSub)).toBeNull();
    await answerRequest(db, MASTER, helperSub, req!.id, "accept");

    const view = (await loadMatter(db, MASTER, matterId, helperSub))!;
    expect(view).toMatchObject({ role: "helper", sees: "anonymised" });
    const text = JSON.stringify(view);
    expect(text).not.toContain("Erika");
    expect(text).not.toContain("erika@example.ch");
    expect(text).not.toContain("Musterweg");
    expect(text).not.toContain(owner);
    expect(view.core.hide).toEqual([]);

    const helperM = (await openMatter(db, MASTER, matterId, helperSub))!;
    const doc = await readDocument(db, helperM, view.documents[0]!.id);
    expect(doc!.text).not.toContain("Erika");
    // The same person is the same placeholder in the thread and in the letter.
    const token = doc!.text.match(/\[NAME-\d+\]/)![0];
    expect(view.core.title).toContain(token);

    // The owner still sees everything, and the list line is anonymised for the helper.
    expect(JSON.stringify(await loadMatter(db, MASTER, matterId, owner))).toContain("Erika Muster");
    const line = (await listMatters(db, MASTER, helperSub)).find((x) => x.id === matterId)!;
    expect(line).toMatchObject({ role: "helper" });
    expect(line.title).not.toContain("Erika");
  });

  it("gives the owner the lawyer's verified name, provably the one checked", async () => {
    const { id: helperId, sub: helperSub } = await verifiedLawyer();
    const { owner, m } = await clientMatter();
    const engagementId = await requestHelp(db, m, owner, { helperId, message: "Please review", sees: "full" });
    await answerRequest(db, MASTER, helperSub, engagementId, "accept");
    const [e] = await matterEngagements(db, MASTER, m);
    expect(e).toMatchObject({ status: "accepted", disclosure: { legalName: "Anna Beispiel", verified: [{ jurisdiction: "CH-ZH", ok: true }] } });
    // The helper, reading the same list, gets no disclosure.
    const asHelper = (await openMatter(db, MASTER, m.id, helperSub))!;
    expect((await matterEngagements(db, MASTER, asHelper))[0]!.disclosure).toBeUndefined();
  });

  it("lets only the owner ask, refuses a second open request and asking yourself", async () => {
    const { id: helperId, sub: helperSub } = await verifiedLawyer();
    const { owner, m } = await clientMatter();
    await requestHelp(db, m, owner, { helperId, message: "Hello" });
    await expect(requestHelp(db, m, owner, { helperId, message: "Again" })).rejects.toThrow("already_asked");
    await expect(requestHelp(db, { ...m, role: "helper" }, owner, { helperId, message: "x" })).rejects.toThrow(NotAllowed);

    const own = await clientMatter();
    const mine = await saveHelper(db, own.owner, { kind: "assistant", name: "Self", status: "listed", languages: ["de"] });
    await expect(requestHelp(db, own.m, own.owner, { helperId: mine, message: "me" })).rejects.toThrow("own_profile");
    expect(helperSub).toBeTruthy();
  });

  it("ends access the moment the owner ends it, and lets a helper leave", async () => {
    const { id: helperId, sub: helperSub } = await verifiedLawyer();
    const { owner, matterId, m } = await clientMatter();
    const e1 = await requestHelp(db, m, owner, { helperId, message: "Hi" });
    await answerRequest(db, MASTER, helperSub, e1, "accept");
    expect(await openMatter(db, MASTER, matterId, helperSub)).not.toBeNull();
    expect(await endEngagement(db, m, e1)).toBe(true);
    expect(await openMatter(db, MASTER, matterId, helperSub)).toBeNull();

    const e2 = await requestHelp(db, m, owner, { helperId, message: "Again, please" });
    await answerRequest(db, MASTER, helperSub, e2, "accept");
    const asHelper = (await openMatter(db, MASTER, matterId, helperSub))!;
    expect(await leaveMatter(db, asHelper, helperSub)).toBe(true);
    expect(await openMatter(db, MASTER, matterId, helperSub)).toBeNull();
  });

  it("declining leaves the matter closed to the helper", async () => {
    const { id: helperId, sub: helperSub } = await verifiedLawyer();
    const { owner, matterId, m } = await clientMatter();
    const e = await requestHelp(db, m, owner, { helperId, message: "Hi" });
    await answerRequest(db, MASTER, helperSub, e, "decline");
    await expect(answerRequest(db, MASTER, helperSub, e, "accept")).rejects.toThrow("already_answered");
    expect(await openMatter(db, MASTER, matterId, helperSub)).toBeNull();
    // Someone else cannot answer a request that is not theirs.
    expect(await answerRequest(db, MASTER, someone("stranger"), e, "accept")).toBeNull();
  });
});

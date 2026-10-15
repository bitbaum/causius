import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { setDb } from "../db";
import { MASTER, testDb } from "../test/db";
import { createMatter, listMatters } from "../matters/store";
import { adoptLegacyMatters } from "./legacy";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await testDb());
  setDb(db);
  process.env.DATABASE_URL = "postgres://test";
  process.env.BETTER_AUTH_SECRET = "x".repeat(48);
});
afterAll(async () => {
  setDb(undefined);
  delete process.env.DATABASE_URL;
  await close();
});

const SITE = "https://causius.orangecat.ch";
async function post(path: string, body: unknown, cookie?: string) {
  const { POST } = await import("./index");
  return POST(
    new Request(`${SITE}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: SITE,
        "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}
const cookieOf = (r: Response) =>
  r.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

describe("accounts without OrangeCat", () => {
  it("a person registers with an email and a password, and has a session", async () => {
    const r = await post("/sign-up/email", {
      email: "ada@example.ch",
      password: "correct horse battery",
      name: "",
    });
    expect(r.status).toBe(200);
    const { GET } = await import("./index");
    const s = await GET(
      new Request(`${SITE}/api/auth/get-session`, {
        headers: { cookie: cookieOf(r), "x-forwarded-for": "198.51.100.250" },
      }),
    );
    const body = (await s.json()) as { user: { email: string; role: string } };
    expect(body.user).toMatchObject({
      email: "ada@example.ch",
      role: "customer",
    });
  });

  it("signing in with the wrong password is refused", async () => {
    expect(
      (
        await post("/sign-in/email", {
          email: "ada@example.ch",
          password: "not the password",
        })
      ).status,
    ).toBe(401);
  });
});

describe("matters made while OrangeCat was the only way in", () => {
  it("move to the account the same person now has, once", async () => {
    const id = await createMatter(db, MASTER, {
      ownerSub: "oc-actor-1",
      core: { title: "Old matter", summary: "", area: "", facts: [], hide: [] },
    });
    await adoptLegacyMatters(db, "oc-actor-1", "user-1");
    expect(
      (await listMatters(db, MASTER, "user-1")).map((m) => m.id),
    ).toContain(id);
    expect(await listMatters(db, MASTER, "oc-actor-1")).toEqual([]);
    // Again: nothing left to move, nothing breaks.
    await adoptLegacyMatters(db, "oc-actor-1", "user-1");
    expect((await listMatters(db, MASTER, "user-1")).length).toBe(1);
  });

  it("never touches anyone else's matters", async () => {
    await createMatter(db, MASTER, {
      ownerSub: "someone-else",
      core: { title: "Theirs", summary: "", area: "", facts: [], hide: [] },
    });
    await adoptLegacyMatters(db, "oc-actor-1", "user-1");
    expect((await listMatters(db, MASTER, "someone-else")).length).toBe(1);
  });
});

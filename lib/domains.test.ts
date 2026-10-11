import { beforeEach, describe, expect, it } from "vitest";
import { checkDomains, describeDomain, IANA_RDAP_BOOTSTRAP, normaliseDomain, resetRdapCache, serversFromBootstrap } from "./domains";

const BOOTSTRAP = {
  services: [
    [["com", "net"], ["https://rdap.verisign.com/com/v1/"]],
    [["ch", "li"], ["http://insecure.example/", "https://rdap.nic.ch"]],
    [["xyz"], ["http://only-plain.example/"]],
  ],
};

/** A registry that holds exactly the names given. */
function registry(held: string[], calls: string[] = []): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url === IANA_RDAP_BOOTSTRAP) return Response.json(BOOTSTRAP);
    if (url.includes("broken.com")) return new Response("busy", { status: 503 });
    const name = decodeURIComponent(url.split("/domain/")[1] ?? "");
    return held.includes(name) ? Response.json({ ldhName: name }) : new Response("", { status: 404 });
  }) as typeof fetch;
}

beforeEach(() => resetRdapCache());

describe("normaliseDomain", () => {
  it("accepts what a person types and refuses what is not a name", () => {
    expect(normaliseDomain(" https://Causius.com/about ")).toBe("causius.com");
    expect(normaliseDomain("causius.ch.")).toBe("causius.ch");
    expect(normaliseDomain("xn--bcher-kva.ch")).toBe("xn--bcher-kva.ch");
    for (const bad of ["causius", "-bad.com", "a..com", "evil.com?x", "space name.com", "x.c"]) {
      expect(normaliseDomain(bad)).toBeNull();
    }
  });
});

describe("serversFromBootstrap", () => {
  it("keeps only https registries and ignores a malformed file", () => {
    const s = serversFromBootstrap(BOOTSTRAP);
    expect(s.get("com")).toBe("https://rdap.verisign.com/com/v1/");
    expect(s.get("ch")).toBe("https://rdap.nic.ch/");
    expect(s.has("xyz")).toBe(false);
    expect(serversFromBootstrap({ services: "nope" }).size).toBe(0);
  });
});

describe("checkDomains", () => {
  it("says what the registry said, and only that", async () => {
    const calls: string[] = [];
    const results = await checkDomains(
      ["causius.com", "causius.ch", "saldius.com", "broken.com", "thing.xyz", "not a domain"],
      registry(["causius.com"], calls),
    );
    expect(results.map((r) => [r.name, r.status])).toEqual([
      ["causius.com", "registered"],
      ["causius.ch", "not_registered"],
      ["saldius.com", "not_registered"],
      ["broken.com", "unknown"],
      ["thing.xyz", "unknown"],
      ["not a domain", "invalid"],
    ]);
    expect(results[1].registry).toBe("rdap.nic.ch");
    // The bootstrap is read once, not once per name.
    expect(calls.filter((c) => c === IANA_RDAP_BOOTSTRAP)).toHaveLength(1);
    expect(describeDomain(results[1])).toContain("not registered");
  });

  it("is unknown, never 'free', when the bootstrap cannot be read", async () => {
    const down = (async () => new Response("", { status: 500 })) as unknown as typeof fetch;
    const [r] = await checkDomains(["causius.com"], down);
    expect(r.status).toBe("unknown");
  });
});

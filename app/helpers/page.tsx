import type { Metadata } from "next";
import Link from "next/link";
import { btnPrimary, card, eyebrow, link, shell } from "@/components/ui";

export const metadata: Metadata = {
  title: "Helpers",
  description:
    "The Causius marketplace: legal assistants who help with paperwork, and licensed lawyers who can advise and represent you.",
};

const REPO = "https://github.com/bitbaum/causius";
const applyHref = (role: string) =>
  `${REPO}/issues/new?title=${encodeURIComponent(`Helper application: ${role}`)}&body=${encodeURIComponent(
    "Role: " +
      role +
      "\nJurisdictions:\nAreas of law:\nLanguages:\nHow you want to be listed (name or pseudonym):\n\nDo not post identity documents here. Verification happens privately.",
  )}`;

/**
 * NOBODY IS LISTED HERE YET, AND THE PAGE SAYS SO.
 *
 * The earlier Lex demo in Botsmann filled this space with invented lawyers,
 * ratings and response times. For a demo that reads as "illustrative"; on a
 * live legal site it reads as real people who can be hired, and a person with a
 * deadline will try. So: the rules, the roles and an application link — and
 * profiles only when there are real ones.
 */
const ROLES = [
  {
    key: "assistant",
    name: "Legal assistant",
    identity: "Name or pseudonym",
    does: [
      "Explains procedure and what an office usually expects",
      "Helps gather and order evidence",
      "Fills in forms with you, translates, prepares the filing",
    ],
    doesNot: "Does not give legal advice, take a position on your case, or represent you.",
    checks:
      "Reputation is earned on the platform: completed cases and the client's own confirmation that the work was done. A pseudonym keeps the same history, so it cannot be shed.",
  },
  {
    key: "lawyer",
    name: "Licensed lawyer",
    identity: "Real name and bar registration",
    does: [
      "Advises you on your rights and your options",
      "Reviews or writes what you send",
      "Represents you before the authority or the court",
    ],
    doesNot: "Only for the jurisdictions they are admitted in, shown on their profile.",
    checks:
      "Admission is checked against the public bar register of each jurisdiction before the profile is listed, and re-checked.",
  },
];

const RULES = [
  [
    "The label is the law",
    "Who may give legal advice is set by each country, and almost everywhere it is reserved to admitted lawyers. A helper's label says which side of that line they are on, and they may not work past it.",
  ],
  [
    "Pseudonymous, not anonymous",
    "Many people who know a system best learned it by going through it, and would rather not put their name to that. They can help under a pseudonym. Licensed lawyers cannot: their licence is their name.",
  ],
  [
    "You choose what a helper sees",
    "A helper gets the case file you hand them and nothing else. It is a file you export, so you can read exactly what you are sharing first.",
  ],
  [
    "Any jurisdiction, one at a time",
    "A case names where it is. Helpers are matched on that place, the area of law and a language you share.",
  ],
];

export default function HelpersPage() {
  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <p className={eyebrow}>Marketplace</p>
      <h1 className="mt-4 max-w-[20ch] font-heading text-4xl font-semibold leading-tight tracking-display sm:text-5xl">
        People who help when the AI is not enough
      </h1>
      <p className="mt-5 max-w-prose text-lg leading-relaxed text-fg-secondary">
        Two kinds of people work on Causius cases. What separates them is not price or rank but what
        the law lets each of them do.
      </p>

      <div className="mt-8 rounded-card border border-accent-fg px-5 py-4">
        <p className="font-medium">No helpers are listed yet.</p>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-fg-secondary">
          The marketplace is open for applications and has not started matching. Until it has, use
          the case file with a lawyer or advice centre you find yourself: it is made to be handed
          over.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {ROLES.map((r) => (
          <article key={r.key} className={`${card} flex flex-col sm:p-8`}>
            <h2 className="font-heading text-2xl font-semibold">{r.name}</h2>
            <p className="mt-1 font-mono text-xs uppercase tracking-caps text-fg-muted">
              Listed under: {r.identity}
            </p>
            <ul className="mt-5 grid list-disc gap-2 pl-5 text-sm leading-relaxed">
              {r.does.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-fg-secondary">{r.doesNot}</p>
            <p className="mt-4 border-t border-border-subtle pt-4 text-sm leading-relaxed text-fg-secondary">
              {r.checks}
            </p>
            <p className="mt-6 flex-1 content-end">
              <a href={applyHref(r.name)} className={link}>
                Apply as a {r.name.toLowerCase()}
              </a>
            </p>
          </article>
        ))}
      </div>

      <section className="mt-16">
        <h2 className="font-heading text-3xl font-semibold tracking-display">The rules</h2>
        <dl className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {RULES.map(([t, d]) => (
            <div key={t}>
              <dt className="font-heading text-lg font-semibold">{t}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-fg-secondary">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-14">
        <Link href="/cases/new" className={btnPrimary}>
          Start a case <span aria-hidden="true">&rarr;</span>
        </Link>
      </p>
    </main>
  );
}

import Link from "next/link";
import { btnPrimary, card, eyebrow, link, shell } from "@/components/ui";

/**
 * The front page. It replaces the day-zero placeholder.
 *
 * One rule carried over from that placeholder: nothing here is claimed unless
 * it is true today. There is no helper count, no testimonial and no "trusted
 * by" — the marketplace is open for applications and has nobody listed yet, and
 * the page says exactly that.
 */
const STEPS = [
  {
    n: "01",
    title: "Show it the letter",
    body: "Paste the text or add a photo. Say which languages you read best.",
  },
  {
    n: "02",
    title: "See what it wants",
    body: "A plain summary, the deadline, each thing asked of you as a checklist, a full translation and a draft reply.",
  },
  {
    n: "03",
    title: "Bring in a person",
    body: "Export the case file and hand it to a legal assistant or a licensed lawyer, who starts from the facts instead of from zero.",
  },
];

const TIERS = [
  {
    name: "Causius AI",
    can: "Reads, translates, lists what is asked and drafts a reply.",
    limit: "Legal information only. It does not advise or represent you.",
  },
  {
    name: "Legal assistants",
    can: "People who know the paperwork: gathering evidence, forms, filing, translation. They may work under a pseudonym.",
    limit: "Not lawyers. They help you do it; they do not give legal advice.",
  },
  {
    name: "Licensed lawyers",
    can: "Admitted to practise where your case is, under their real name and bar registration. They advise and can represent you.",
    limit: "Licensed per jurisdiction: a lawyer in one country cannot advise on another's law.",
  },
];

export default function Home() {
  return (
    <main>
      <section className={`${shell} py-16 sm:py-24`}>
        <p className={eyebrow}>Any legal issue, anywhere</p>
        <h1 className="mt-5 max-w-[18ch] font-heading text-5xl font-semibold leading-[1.02] tracking-display sm:text-7xl">
          Understand the letter. Answer it in time.
        </h1>
        <p className="mt-7 max-w-prose text-lg leading-relaxed text-fg-secondary">
          An official letter arrives in a language you half read, with a deadline and a paragraph
          number. Causius tells you what it says, what it wants from you and by when, and finds a
          person to help when a person is what you need.
        </p>
        <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
          <Link href="/cases/new" className={btnPrimary}>
            Start a case <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link href="/cases/sample" className={link}>
            See a worked example
          </Link>
        </div>
      </section>

      <section className="border-y border-border-subtle">
        <ol className={`${shell} grid gap-10 py-12 sm:grid-cols-3`}>
          {STEPS.map((s) => (
            <li key={s.n}>
              <p className={eyebrow}>{s.n}</p>
              <h2 className="mt-3 font-heading text-xl font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${shell} py-16`}>
        <h2 className="max-w-[26ch] font-heading text-3xl font-semibold tracking-display sm:text-4xl">
          Three kinds of help, and an honest line between them
        </h2>
        <p className="mt-4 max-w-prose leading-relaxed text-fg-secondary">
          Most legal trouble starts as paperwork, and most paperwork does not need a lawyer. Some of
          it does. Causius keeps the difference visible.
        </p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {TIERS.map((t) => (
            <article key={t.name} className={card}>
              <h3 className="font-heading text-xl font-semibold">{t.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-primary">{t.can}</p>
              <p className="mt-3 border-t border-border-subtle pt-3 text-sm leading-relaxed text-fg-secondary">
                {t.limit}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-8">
          <Link href="/helpers" className={link}>
            How the marketplace works, and how to join it
          </Link>
        </p>
      </section>

      <section className={`${shell} pb-4`}>
        <div className={`${card} sm:p-8`}>
          <h2 className="font-heading text-2xl font-semibold">Your case stays with you</h2>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-secondary">
            This version has no accounts. A case is kept in your browser, on your device, and nowhere
            else. A letter you submit for analysis is sent to the AI provider (Anthropic) to be read and is not
            stored by Causius. You can export a case as a file, hand it to a helper, and delete it.
          </p>
        </div>
      </section>
    </main>
  );
}

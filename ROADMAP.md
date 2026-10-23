# Roadmap

Where Causius is going, in the order it is going there. Causius is the legal
layer of the fleet: an agent that does legal work on a sealed case file, a person
who decides what leaves it, and lawyers where the law reserves the work for them.
Causius holds legal work (matters, founding and registering, keeping contracts);
the law itself belongs in Solon, as data. Nothing below is dated on purpose, and nothing is
described as built unless it is.

## Now

### Read a letter and say what it wants {#read}

A letter in, a case file out: the deadline, each thing asked for, a full
translation and a draft reply.

- [x] Intake by pasted text or a photo of the letter {#intake}
- [x] The case file: deadline, checklist, translations, draft reply {#case-file}
- [x] Cases kept in the browser, with export and import {#export}
- [x] Analysis through the fleet's shared model chain, with a rate limit {#shared-models}
- [x] Your own model: connect a key, checked, strongest model preselected {#own-model}
- [x] The interface and the analysis in English, German, French and Italian; letters translated into nineteen languages {#languages}
- [x] Letters of several pages, photographed in order {#pages}
- [x] The deadline shown with the sentence of the letter it was read from {#deadline-source}
- [ ] Shared model keys set on the host, and the first real letter analysed there
- [ ] A set of real letters with known answers, to measure how often the deadline is right
- [ ] Letters that arrive as a PDF

### Private by construction {#privacy}

The model reads what a letter asks for; it does not need to know who it is
about. Nobody — the model provider, a helper, Causius — sees more than they
need.

- [x] Personal details replaced in the browser before a letter is sent {#anonymise}
- [x] Details covered on page photos before they are sent {#anonymise-photos}
- [x] An anonymised case file to hand to a helper {#anonymise-export}
- [x] A strict content security policy and security headers {#security}
- [ ] Read the text of a photographed page in the browser, so photos are anonymised automatically too
- [ ] Model providers that contractually do not train on or retain what they are sent
- [ ] An independent security review before the first real users

### Say what Causius is, in one place {#identity}

Problem, solution, mission and vision live in the Loki project profile and are
rendered here, never written twice.

- [x] Roadmap and changelog kept in this repository and rendered from the fleet map {#records}
- [ ] Problem, solution, mission and vision filled in on the Loki profile
- [ ] An OrangeCat profile, so the project can be found and funded
- [ ] A Solon organisation, so its rules can be decided in the open

### Matters worked by an agent {#matters}

A matter is anything legal to be handled. The agent researches, records
deadlines, drafts, and proposes anything outward for the owner to approve.

- [x] Causius accounts of its own (password, sign-in link, passkey, two-step codes); Sign in with OrangeCat as one way in {#sign-in}
- [x] Matters stored on our host, each sealed with its own key (AES-256-GCM) {#sealed-matters}
- [x] The agent: web research with sources, deadlines, tasks, facts, drafts, approvals {#agent}
- [x] Every personal detail, and the account name, hidden from the model {#agent-privacy}
- [x] Documents added to a matter: PDF and text, only the text kept {#documents}
- [x] Check domain names with the registries before founding on a name {#domains}
- [x] Start from a common problem: a workflow says what to establish and draft, never the law itself {#workflows}
- [x] Ask up to three questions across every document of a matter, answered as a table with the passage each answer came from {#document-review}
- [x] The agent reads the law itself from the official sources, for no fee: Swiss federal law from Fedlex, Liechtenstein from gesetze.li and all 26 cantons through LexFind {#reads-law}
- [x] Every answer checked before it is shown: law needs a source, a deadline given is a deadline recorded, tool calls are made and not narrated, the answer is in the reader's language, and a turn always ends with an answer {#answer-checks}
- [ ] Watch a matter's rules: tell its owner when a law, a form or a deadline it depends on changes
- [ ] Deadline reminders by e-mail
- [x] Bring a quick-check letter into a matter in one step {#letter-to-matter}
- [ ] Keys only the owner holds, so the operator cannot open a matter

### The fleet's design and a technical narrative {#site}

- [x] Built on @bitbaum/design-tokens, in the grammar Solon and Loki use {#design}
- [x] Platform, Security and Ecosystem pages; the fleet read from the fleet map {#narrative}

## Next

### The law from Solon {#law-from-solon}

Causius holds legal work; the law itself belongs in Solon, as data. Until it is
there Causius reads the official publishers directly, and keeps doing so as a
check. The plan, the sources and the sizes are in Solon's
`docs/design/2026-10-law-as-data.md`.

- [ ] Solon holds the acts (its register, then federal text, then Liechtenstein, then the cantons)
- [x] The agent asks Solon first and falls back to the publisher; an answer cites the publisher's link and Solon's hash. Done for federal acts and Liechtenstein's ten common acts; cantonal acts are still read from LexFind {#law-from-solon-read}
- [ ] The agent asks Solon for cantonal acts too, once Solon names them by abbreviation or reads each canton's own text {#law-from-solon-cantons}
- [ ] The agent tells a person when a law a matter depends on has changed, with what changed

### The big problems, as workflows {#big-workflows}

A workflow says what to establish and what to draft, never the law itself. The
common problems are covered (debt, rent increase, tax assessment, dismissal,
insurance refusal, association). The ones people most often bring, and that
Causius can only meet today by improvising, are not:

- [ ] Founding a company in Switzerland or Liechtenstein: the form (GmbH, AG, sole proprietorship), capital, statutes and the founding checklist; the notarial deed, the capital deposit and the register entry are handed over to a notary, never done here {#wf-company}
- [ ] Divorce: agreement or dispute, children, property and pensions; the petition and a draft convention; a lawyer recommended where the law and the sums call for one {#wf-divorce}
- [ ] A notice ending a tenancy, and an eviction: which it is, the thirty days to contest, the request for an extension, the draft {#wf-termination}
- [ ] Choosing a vehicle for an investment or an inheritance (foundation, Anstalt, company, fund) and comparing it across Switzerland, Liechtenstein, Luxembourg and Ireland: a sourced first draft, and then a licensed trustee or lawyer {#wf-vehicle}

### Law beyond Switzerland and Liechtenstein {#more-law}

Switzerland and Liechtenstein are the markets. A country is added by giving it
a reader for its official publisher; Luxembourg and Ireland are first, because
vehicle comparisons need them.

- [ ] Luxembourg: Legilux, read as Fedlex is
- [ ] Ireland: the Irish Statute Book, read the same way
- [ ] The citation check recognises each market's way of citing law, so a rule quoted without a source is caught there too (today it knows Swiss and Liechtenstein forms only)

### Helpers you can actually reach {#helpers}

Legal assistants and licensed lawyers offer their help as services on OrangeCat
and are paid there. Causius adds the label and the check.

- [x] The rules: who may give legal advice, and who may be pseudonymous {#helper-rules}
- [x] Helpers list themselves by jurisdiction, area and language, under a name or a pseudonym {#directory}
- [x] A lawyer's identity held privately and shown to a client when they engage them {#disclosure}
- [x] A lawyer's admission checked against the public register before the label, published as a signed attestation {#attestation}
- [x] Ask a helper about a matter, sharing it with or without your personal details {#engage}
- [ ] Helpers paid through OrangeCat, with the money held until the work is accepted; a flat price per piece of work, never a share of a lawyer's fee
- [ ] Credentials issued by a bar itself, so the check needs no word of ours. Today's attestation is a signed selective disclosure: a reviewer checked the admission, and the public sees only what the lawyer chooses. It is not yet a zero-knowledge proof, and says so
- [ ] Notices by e-mail when a helper is asked, answers or writes

### Decide the marketplace rules in the open {#governance}

Who is admitted, what a label requires and how a dispute is settled are
decisions, and decisions belong on Solon.

- [ ] Admission and labelling rules adopted by a recorded vote
- [ ] A dispute between a person and a helper has a written path

## Later

### A matter shared with a helper {#rooms}

- [x] A shared matter: the person, their helper and the agent in one thread, the helper seeing only what is shared {#shared-matter}

### Legal existence {#existence}

- [ ] Found a company or an association: documents prepared by the agent, filed on approval
- [ ] Register a domain on approval, through a registrar connected to OrangeCat payments
- [ ] Contracts signed by the parties, obligations tracked, payment held in escrow on OrangeCat
- [ ] Law firms running Causius on models inside their own walls

### More than letters {#beyond}

- [ ] Forms filled from the facts already in the case
- [ ] Guides per jurisdiction for the most common procedures

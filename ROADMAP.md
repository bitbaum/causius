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
- [x] The interface and the analysis in English, German and French {#languages}
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

- [x] Sign in with OrangeCat; one account across the fleet {#sign-in}
- [x] Matters stored on our host, each sealed with its own key (AES-256-GCM) {#sealed-matters}
- [x] The agent: web research with sources, deadlines, tasks, facts, drafts, approvals {#agent}
- [x] Every personal detail, and the account name, hidden from the model {#agent-privacy}
- [x] Documents added to a matter: PDF and text, only the text kept {#documents}
- [x] Check domain names with the registries before founding on a name {#domains}
- [ ] Deadline reminders by e-mail
- [ ] Bring a quick-check letter into a matter in one step
- [ ] Keys only the owner holds, so the operator cannot open a matter

### The fleet's design and a technical narrative {#site}

- [x] Built on @bitbaum/design-tokens, in the grammar Solon and Loki use {#design}
- [x] Platform, Security and Ecosystem pages; the fleet read from the fleet map {#narrative}

## Next

### Helpers you can actually reach {#helpers}

Legal assistants and licensed lawyers offer their help as services on OrangeCat
and are paid there. Causius adds the label and the check.

- [x] The rules: who may give legal advice, and who may be pseudonymous {#helper-rules}
- [ ] Helpers listed from their OrangeCat services, by jurisdiction, area and language, under a name or a pseudonym
- [ ] A lawyer's identity held privately and shown to a client when they engage them
- [ ] A lawyer's admission checked against the public bar register before the label
- [ ] Hand a case to a helper from the case page, sharing only what you choose

### Decide the marketplace rules in the open {#governance}

Who is admitted, what a label requires and how a dispute is settled are
decisions, and decisions belong on Solon.

- [ ] Admission and labelling rules adopted by a recorded vote
- [ ] A dispute between a person and a helper has a written path

## Later

### A matter shared with a helper {#rooms}

- [ ] A shared matter: the person, their helper and the agent in one thread, the helper seeing only what is shared

### Legal existence {#existence}

- [ ] Found a company or an association: documents prepared by the agent, filed on approval
- [ ] Register a domain on approval, through a registrar connected to OrangeCat payments
- [ ] Contracts signed by the parties, obligations tracked, payment held in escrow on OrangeCat
- [ ] The law cited from Solon as versioned data, rule by rule
- [ ] Law firms running Causius on models inside their own walls

### More than letters {#beyond}

- [ ] Forms filled from the facts already in the case
- [ ] Guides per jurisdiction for the most common procedures

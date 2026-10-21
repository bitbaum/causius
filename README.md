# Causius

The legal layer of the fleet: an agent that does legal work on a sealed case file,
a person who decides what leaves it, and licensed lawyers where the law reserves the
work for them. Read a letter without an account, or open a matter and let the agent
research, keep the deadlines and draft.

Served at [causius.orangecat.ch](https://causius.orangecat.ch). Beta: running, not released. The idea descends from the Lex legal assistant sketched in
Botsmann: AI for the routine work, and a marketplace of humans for the rest, for any legal
issue in any jurisdiction.

## Three kinds of help

| | Does | Does not |
| --- | --- | --- |
| **Causius AI** | Reads, translates, lists what is asked, drafts a reply | Give legal advice or represent anyone |
| **Legal assistant** (name or pseudonym) | Procedure, gathering evidence, forms, filing, translation | Give legal advice |
| **Licensed lawyer** (real name, bar registration) | Advises and represents, in the jurisdictions they are admitted in | Work outside those jurisdictions |

The line between the last two is set by law in almost every country. It is the one
rule of the product that is not ours to relax.

## Where it sits

Causius is one product on three planes, like everything else in the fleet
(`bitbaum/fleet` `AGENTS.md` is the authority; this is only how it shows up here):

- **Loki** builds and ships it, and holds its identity. Problem, solution,
  mission and vision live in the Loki project profile; the site renders them
  from the fleet map (`lib/fleet.ts`) and does not author them. `ROADMAP.md` and
  `CHANGELOG.md` in this repository are the public record: Loki ingests them and
  `/roadmap` and `/changelog` read the map back through `bip-kit`.
- **OrangeCat** is its economy, and one way in. Causius has its own accounts
  (`@bitbaum/accountkit/auth`, better-auth): email and password, a sign-in
  link, passkeys, two-step codes — no OrangeCat account needed. "Sign in with
  OrangeCat" is one button among them for people who have one. Helpers will
  offer their work as OrangeCat services and be paid there.
- **Solon** is its governance. Who is admitted as a helper and how a dispute is
  settled are decisions to be taken there.

The footer links to the OrangeCat profile and the Solon organisation only when
the fleet map reports that they exist. Today neither does.

## Stack

The blessed column of fleet `STACK.md`, nothing else:

| Job | Here |
| --- | --- |
| AI | `@bitbaum/ai-kit` `complete()` over the shared free chain; no vendor SDK, no pinned model id |
| A reader's own model | `ai-kit/byok` + `ai-kit/byok-probe`, key kept in the browser only |
| Validation | `zod` (the case file, every request body, the fleet map entry) |
| Rate limiting | `limitkit` |
| Roadmap and changelog | `bip-kit`, from the fleet map |
| i18n | `next-intl`: English (`/en`), German (`/de`), French (`/fr`) |
| Accounts | `@bitbaum/accountkit/auth` (better-auth on Drizzle): password, link, passkeys, 2FA, OrangeCat OIDC with PKCE |
| Conversation | `@bitbaum/chatkit` |
| Search and filters | `@bitbaum/searchkit` (typo-tolerant ranking) and `listkit` (facets in the URL), for the helper directory |
| Attestations | SD-JWT signed with Ed25519 by `node:crypto` (`lib/helpers/attest.ts`); key derived from the master key, published at `/.well-known/jwks.json` |
| Design | `@bitbaum/design-tokens` (tokens.css + the Tailwind preset via `@config`) |
| Data | Postgres on the host, Drizzle (`lib/db/schema.ts`, `drizzle/`), envelope encryption in `lib/crypto.ts` |
| Tests | Vitest, hermetic; the store and the agent run against PGlite, a real Postgres in process |
| Deploy | PR, CI, merge, deploy to the box, Live check |

`@bitbaum/sitekit` is deliberately not used: it renders generated client sites,
and its contract is that they do not wear the fleet's tokens. A fleet product
does, in the grammar Solon uses (`kicker`, `headline-caps`, `btn-frame`).

## What exists today

- `/` what Causius is; `/platform` how it is built and why; `/security` what
  protects a matter; `/ecosystem` the fleet, read from the fleet map
- `/matters` a signed-in person's matters; `/matters/[id]` the workspace: the
  conversation with the agent, deadlines, decisions waiting, documents, privacy
- `/sign-in`, `/sign-up`, `/account` Causius's own accounts: password, link, passkey, two-step codes, OrangeCat
- `/cases/new` intake: paste a letter or photograph up to four pages, pick translation languages
- `/cases/[id]` the case: deadline, checklist of what is asked, the letter in each
  language, a draft reply, who should look at it, export
- `/cases` cases in this browser, and import of an exported case file
- `/cases/sample` a worked example with invented personal details
- `/settings` your own model
- `/helpers` the directory (searchkit, listkit); `/helpers/[id]` a profile, with
  a lawyer's signed attestation and "Ask for help"
- `/helper` your own helper profile, admission and requests; `/review` the staff
  queue of admissions; `/verify` check any attestation
- `GET /.well-known/jwks.json` the key attestations are signed with
- `/roadmap`, `/changelog` the public record
- `POST /api/analyze` letter in, case file out
- `POST /api/model/check` does this key work, and which models can it use
- `GET /api/health` is the site up, and can it analyse text and photos without a reader's key
- `POST /api/transcribe` a spoken take to text; `GET /api/models` the free
  models the picker may offer (both signed in)
- `/api/helpers`, `/api/helper/…`, `/api/review/…`, `/api/credentials/verify`,
  `/api/matters/[id]/engagements` and `/leave`: the helper side
- `/api/matters/…` create, read, work (`messages`, one agent turn), documents,
  photographed `pages`, items and approvals; every route answers 401 signed out and 404 to anyone
  who is not in the matter

Every page exists in English, German, French and Italian (`/en/…`, `/de/…`,
`/fr/…`, `/it/…`; the list is `i18n/routing.ts`, with why);
`/` opens in the browser's language. An analysis is written in the reader's
language, and a letter can be translated into any of the languages in
`lib/languages.ts`. Causius serves Switzerland and Liechtenstein
(`MARKETS` in `lib/jurisdictions.ts`: one record per country, so adding one is
one record and its words); the agent researches anywhere.

## What does not exist yet

Said plainly, because the pages say it too. `ROADMAP.md` has the order.

- **Helpers are not paid through Causius.** A profile links to where its
  helper is paid (an OrangeCat service or their own page); escrow is planned.
- **A lawyer's admission is checked by a person.** A reviewer reads the public
  register; no bar issues credentials of its own yet, so the attestation says
  "Causius checked", not a zero-knowledge proof that needs no one's word.
- **A quick-check case stays in the browser.** It is not moved into a matter yet.
- **A helper's messages do not notify anyone.** The other side sees them on
  the matter page; e-mail notices are planned.
- **Approving does not act.** It records the decision; sending or filing is still
  done by the person.
- **The operator holds the master key.** Keys only the owner holds are on the roadmap.

## Configuration

The free analysis runs on whichever of the fleet's shared vendor keys this
deployment has. With none of them, `/api/analyze` answers `503 not_configured`
and the intake page offers your own model or filing by hand.

| Variable | Effect |
| --- | --- |
| `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | The shared free chain. Any one switches free analysis on. A photo needs Gemini or OpenRouter: Groq's free models cannot read images. |
| `CAUSIUS_MODEL` | Optional. Start the chain at this model instead of the front. |
| `CAUSIUS_GROQ_MODELS` and the like | Optional per-vendor overrides, read by ai-kit's `freeChain("CAUSIUS")`. |

Limits (per hour, in memory): 8 free analyses per visitor, 60 on your own key;
30 agent turns per account on the free chain, 200 on your own key.

Matters need the first two; without them `/api/matters` answers `503`.
Accounts need `BETTER_AUTH_SECRET` and the database. The rest is optional:

| Variable | Effect |
| --- | --- |
| `DATABASE_URL` | Postgres. `DATABASE_POOL_MAX` (default 10) caps the pool; a single-connection test Postgres needs 1. |
| `CAUSIUS_MASTER_KEY` | 32 random bytes, base64. Seals every matter's data key. Losing it loses every matter; never rotate it by replacing it. |
| `BETTER_AUTH_SECRET` | 32+ characters. Signs sessions and seals two-step secrets. Without it accounts answer 503. |
| `ORANGECAT_OAUTH_CLIENT_ID`, `ORANGECAT_OAUTH_CLIENT_SECRET`, `ORANGECAT_OAUTH_ISSUER` | Optional. Adds the "Sign in with OrangeCat" button (accountkit). Causius accounts work without it. |
| `RESEND_API_KEY`, `RESEND_FROM` | Optional. With both, addresses are verified and sign-in links work (`@bitbaum/mail-kit`). |

After setting a key on the host, check it end to end:

```sh
curl -s https://causius.orangecat.ch/api/health   # {"ok":true,"analysis":{"text":true,"photo":…}}
pnpm run check:analyze                            # the sample letter through a real model, in every interface language
```

`check:analyze` asserts the deadline and its source sentence and prints the rest
to read. It is not part of CI: it needs a key and the network.

## Privacy and security

Causius handles the most private paperwork people have, so both are designed
in rather than added:

- **Anonymised before it leaves the browser.** `lib/redact.ts` replaces names,
  addresses, AHV and IBAN numbers, phone numbers, e-mail addresses, dates of
  birth and labelled reference numbers with placeholders (`[NAME-1]`). The
  reader sees each replacement, can add their own words and preview the exact
  text sent. The model answers with the placeholders and the browser restores
  the real values. Photos are covered by hand in `components/PhotoRedactor.tsx`;
  the boxes are burnt into the pixels before upload.
- **Quick check: nothing stored on the server.** A letter goes to the model
  provider and the answer comes back; only which model served it is logged.
  Cases, the placeholder table and a reader's own API key live in the browser.
- **Matters: sealed.** Each matter has a data key (AES-256-GCM) sealed by
  `CAUSIUS_MASTER_KEY`; every value is sealed with associated data naming its
  matter and purpose, so it cannot be moved. In the clear: ids, the owner's
  actor id, dates, statuses, the jurisdiction code, sizes. The participant row
  holds a role ("Client"), never a name.
- **Matters: the agent never sees who.** Each turn builds one redaction table
  over everything the model will read, with the owner's hidden words and their
  account name; tool arguments and the answer are restored on the server, and
  only for placeholders the model was actually shown (`lib/matters/agent.ts`).
- **Anonymised hand-over.** "Export for a helper" writes the case with every
  personal detail replaced and without the placeholder table.
- **Pseudonymous on every side.** People seeking help, legal assistants and
  lawyers may all appear under a pseudonym; a lawyer's admission is verified
  privately (evidence sealed per credential) and their name, with the
  disclosures that prove it is the checked one, is given to a client on
  engagement. A helper sees a matter with or without the owner's details, as
  the owner chose (`lib/matters/anonymise.ts`, applied in the store).
- **Headers** (`lib/security.ts`, `proxy.ts`): a per-request nonce CSP with
  `strict-dynamic`, `connect-src 'self'` and `frame-ancestors 'none'`; HSTS for
  two years; `nosniff`; `Referrer-Policy: no-referrer`; a Permissions-Policy
  that turns off camera, microphone, location and payment; same-origin
  opener and resource policies; `no-store` on every API response.
- **Abuse limits** per visitor (`lib/limits.ts`), and strict validation of every
  request body and imported file (zod).

What is not covered yet, and on the roadmap: photos are not anonymised
automatically (the reader covers them), the free model providers' own data
terms vary, and there has been no independent security review.

This repository is public: **no real person's letter, name or reference number
belongs in it**, including in tests and the sample.

## The case file

`lib/case.ts` defines `CaseFile`, the one shape the analysis produces, the browser
stores and Export writes. `parseCase` validates anything claiming to be one; both the
model's output and an imported file go through it.

## Design

Every colour, face, radius and measure starts in `@bitbaum/design-tokens`,
imported in the layout before `app/theme.css` and `app/globals.css`. **The look
is decided in one file, `app/theme.css`**, which overrides the token package's
knobs: the colours (light and dark), the faces, the corner radius and how a
headline and a call to action are set. "Make it red", "make it more gothic" (a
blackletter `--theme-headline-font`, other case and tracking) and "a different
typeface" are edits to that file and nothing else. `globals.css` defines no
token: only the few shapes Causius repeats, under the same names Solon uses
(`kicker`, `headline`, `headline-caps`, `btn-primary`, `btn-frame`, `field`),
which read those knobs, and the mapping of accountkit's, chatkit's and
bip-kit's variables onto the tokens.

Light by default, dark when the device asks or the reader chooses (the switch in
the header; `lib/theme.ts` sets the class before first paint, with the response's
CSP nonce). `lib/theme.test.ts` reads `theme.css` and fails if a change makes
text, the accent, the label on it or a status colour unreadable (WCAG AA, 4.5:1)
on any surface in either mode, so a look can be tried freely.
`lib/copy-budget.test.ts` holds each page to a word budget (Home is about 240
words): to add copy, cut copy.

It deliberately differs from OrangeCat, Loki and Solon, which are black with one
orange accent: this is for someone holding a letter with a deadline in it, so it
is warm paper, a deep ink-indigo and near-square corners, the look of a document
to be taken seriously. Amber and red are kept clear for a deadline or a problem.
The structure, the tokens and the primitives are the same, so the products still
sit together.

What a capability page says is real is decided in one file,
`lib/capabilities.ts`; pages name capabilities and never state a status.

## Development

```sh
pnpm install
pnpm dev
pnpm run verify          # type-check, lint and tests; CI also builds
pnpm run check:analyze   # needs a vendor key: the sample letter through a real model
pnpm run check:agent     # needs a vendor key: one matter worked by the real agent
```

Merging to `main` deploys: CI must pass, then the shared deploy workflow builds on the box, health-checks and rolls back on failure.

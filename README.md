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
- **OrangeCat** is its economy and its identity. Sign-in is OrangeCat over
  OpenID Connect (`@bitbaum/accountkit`); Causius keeps no users table, only
  the actor id. `/sign-up` opens OrangeCat's screen on "Create an account", and
  that one account opens OrangeCat, Solon and Loki too. Helpers will offer
  their work as OrangeCat services and be paid there.
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
| Sign-in | `@bitbaum/accountkit` + `next-auth`, OrangeCat OIDC with PKCE |
| Conversation | `@bitbaum/chatkit` |
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
- `/sign-in`, `/sign-up` straight to OrangeCat's one sign-in screen
- `/cases/new` intake: paste a letter or photograph up to four pages, pick translation languages
- `/cases/[id]` the case: deadline, checklist of what is asked, the letter in each
  language, a draft reply, who should look at it, export
- `/cases` cases in this browser, and import of an exported case file
- `/cases/sample` a worked example with invented personal details
- `/settings` your own model
- `/helpers` the marketplace rules and where a helper lists themselves
- `/roadmap`, `/changelog` the public record
- `POST /api/analyze` letter in, case file out
- `POST /api/model/check` does this key work, and which models can it use
- `GET /api/health` is the site up, and can it analyse text and photos without a reader's key
- `/api/matters/…` create, read, work (`messages`, one agent turn), documents,
  items and approvals; every route answers 401 signed out and 404 to anyone
  who is not in the matter

Every page exists in English (`/en/…`), German (`/de/…`) and French (`/fr/…`);
`/` opens in the browser's language. An analysis is written in the reader's
language.

## What does not exist yet

Said plainly, because the pages say it too. `ROADMAP.md` has the order.

- **No helpers are listed.** Nothing pulls in OrangeCat services, labels them or
  checks a lawyer's admission.
- **A quick-check case stays in the browser.** It is not moved into a matter yet.
- **No shared matter.** A matter has one participant, its owner.
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

Matters need all of these; without them `/api/matters` answers `503`:

| Variable | Effect |
| --- | --- |
| `DATABASE_URL` | Postgres. `DATABASE_POOL_MAX` (default 10) caps the pool; a single-connection test Postgres needs 1. |
| `CAUSIUS_MASTER_KEY` | 32 random bytes, base64. Seals every matter's data key. Losing it loses every matter; never rotate it by replacing it. |
| `ORANGECAT_OAUTH_CLIENT_ID`, `ORANGECAT_OAUTH_CLIENT_SECRET`, `ORANGECAT_OAUTH_ISSUER` | Sign-in (accountkit). |
| `AUTH_SECRET`, `AUTH_URL` | Auth.js session encryption and the public origin. |

After setting a key on the host, check it end to end:

```sh
curl -s https://causius.orangecat.ch/api/health   # {"ok":true,"analysis":{"text":true,"photo":…}}
pnpm run check:analyze                            # the sample letter through a real model, in all three languages
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
  privately and their name is given to a client on engagement (planned, with
  the marketplace).
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

Every colour, face, radius and measure comes from `@bitbaum/design-tokens`,
imported in the layout before `app/globals.css`, with its Tailwind preset loaded
through `tailwind.config.js`. The page is pinned dark, like Solon's public
surface. `globals.css` defines no token: only the few shapes Causius repeats,
under the same names Solon uses (`kicker`, `headline`, `headline-caps`,
`btn-primary`, `btn-frame`, `field`), and the mapping of accountkit's,
chatkit's and bip-kit's variables onto the tokens. A colour that is missing
belongs in the token package, so all products get it.

What a capability page says is real is decided in one file,
`lib/capabilities.ts`; pages name capabilities and never state a status.

## Development

```sh
pnpm install
pnpm dev
pnpm run verify          # type-check, lint and tests; CI also builds
pnpm run check:analyze   # needs a vendor key: the sample letter through a real model
```

Merging to `main` deploys: CI must pass, then the shared deploy workflow builds on the box, health-checks and rolls back on failure.

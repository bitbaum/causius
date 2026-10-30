# Agents

<!-- fleet:rules:begin — generated from bitbaum/fleet templates/agent-rules.md; edit it there, not here -->

## Org rules

Read `bitbaum/fleet` `AGENTS.md`, `SHARED.md` and the registers it names before
inventing a host, a name, a page or a shared behaviour. Do not copy their facts
into this file.

- **Packages first.** If a `@bitbaum/*` package (or `bip-kit`, `limitkit`,
  `threadkit`, `ai-forms`) already does it, use it and fix a defect in the
  package, not in this app. Every chat is `@bitbaum/chatkit`, every search box
  `@bitbaum/searchkit`, every chart `@bitbaum/chartkit`, accounts
  `@bitbaum/accountkit`, model calls `@bitbaum/ai-kit`. Review this product's
  `package-plan.json` before building anything. When a second product needs
  what one product built (a map, a globe, a calculator), extract it into a
  package before writing the second copy.
- **A gap is a task, not an answer.** Never end the work, or a reply, at "not
  supported" or "not available". When a source cannot be read or a case does
  not fit the model, find another way (another format or publisher, the
  official tool measured, the model extended) and do it. What truly cannot be
  done yet is tracked with its plan, never presented as a limit of the product.
- **Every page leads to an action.** What a reader learns, they can act on
  from the same screen: file, pay, apply, compare, ask, contact.
- **One shape per kind.** Things of the same kind look the same and sit in the
  same place (fleet `AGENTS.md`, "One shape per kind").
- **Finished work ships by itself.** Open a non-draft pull request; the fleet
  auto-merge sweep is the only merge path. Never merge by hand, through the
  merge API, with `--auto` or with an admin bypass, and never force-push a
  shared branch.
- **Nothing made up.** A fact on a page or in a doc needs a source that was
  opened; where there is none, the line is removed or softened. A gap is
  filled with sourced data, never with a guess.
- **Bitcoin orange is for Bitcoin and top-of-funnel actions only.**
- **No model identifier** in anything pushed to a repository.
- Before you finish, run `node <fleet>/scripts/ci/docs-truth-audit.mjs --dir .`:
  the same check the sweep runs on every pull request.

<!-- fleet:rules:end -->

Read `bitbaum/fleet` `AGENTS.md` and the registers it names before inventing a
host, a name, or a page. Do not copy those facts into this file.

Repo-only notes live below this line.

- **Finish to production without bypassing the fleet merge policy.** Let the
  Fleet auto-merge sweep merge only after the exact required CI and policy
  checks pass. Do not call the GitHub merge API or merge by hand to accelerate
  a PR. After merge, watch the Deploy run and check the live site. The external
  `live-check.yml` verifies every language, security headers and analysis
  availability; a red Live check means the product is not working, regardless
  of the Deploy result. If the fleet merge path is unavailable, record the
  blocker and continue independent work rather than bypassing it.

- Run: `pnpm install`, `pnpm dev`. Check before pushing: `pnpm run verify`
  (type-check, lint, tests). CI also builds.
- Tests are Vitest, next to the code they test (`lib/*.test.ts`,
  `i18n/parity.test.ts`). They are hermetic. `pnpm run check:analyze` and
  `pnpm run check:agent` call a real model; they need a vendor key and are not
  in CI.
- Every string a reader sees lives in `messages/<locale>.json` for each
  locale in `i18n/routing.ts` (en, de, fr, it); the parity test fails on a
  missing key. English is the source.
  German uses Swiss spelling (ss, never ß). Link with `@/i18n/navigation`,
  never `next/link`, so a reader on `/de` stays on `/de`. Every page is under
  its language prefix (`localePrefix: "always"`); see `i18n/routing.ts` for
  why the unprefixed default broke production.
- **Security and privacy are not negotiable, whatever else is.** The owner
  wants speed without approvals; that never extends to weakening them. A
  letter leaves the browser only after `lib/redact.ts` has anonymised it;
  nothing about a letter is stored or logged on the server; the CSP in
  `lib/security.ts` stays nonce-based with `connect-src 'self'`. A change that
  loosens any of these needs a reason written next to it.
- Anyone on the platform may be pseudonymous: people seeking help, legal
  assistants and lawyers. A lawyer's admission is verified privately and their
  name is disclosed to a client on engagement.
- **This repository is public and the product handles legal letters.** No real
  person's letter, name, address or reference number goes into the code, the
  tests, the sample case or a commit message. `lib/sample.ts` is invented.
- Design starts in `@bitbaum/design-tokens`; **the look is decided only in
  `app/theme.css`** (colours light and dark, faces, radius, headline and action
  case), so "red and white" or "more gothic" stays a one-file edit; keep it so.
  `lib/theme.test.ts` keeps any theme readable (WCAG AA). `app/globals.css`
  defines no token (see README "Design").
- **Words are a cost.** `lib/copy-budget.test.ts` holds Home, the quick check,
  the case page, Helpers, Platform and Security to a word budget, and depth
  lives one click away. Before adding a sentence, ask who reads it and what they
  do next; if nobody does, cut it. Whether a capability works today is decided only in
  `lib/capabilities.ts`.
- Matters (`lib/matters/`) are sealed per matter (`lib/crypto.ts`). Nothing
  readable about a person goes into a clear column: the participant alias is a
  role, never a name. Store and agent tests run on PGlite (`lib/test/db.ts`).
- The case file (`lib/case.ts`) is the one shape the analysis produces, the
  browser stores and Export writes. Change the zod schema, not a copy of it.
- The model call is `@bitbaum/ai-kit`'s `complete()` in `lib/analyze.ts`. Do not
  add a vendor SDK, a hand-rolled fetch to a model, or a pinned model id.
- Causius AI gives legal information, not legal advice. Do not weaken the
  system prompt's refusal to advise, and do not blur the assistant/lawyer line
  on `/helpers`: who may give legal advice is set by law, not by us.
- Nothing is claimed on a page unless it is true today. No invented helpers,
  ratings or testimonials.
- `ROADMAP.md` and `CHANGELOG.md` are the public record; Loki's fleet map
  ingests them and the site reads the map back. A user-facing change adds a
  changelog line in the same pull request.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
- Helpers (`lib/helpers/`): who may do what is `lib/professions.ts`, the only
  domain-specific file in it; Diplodoctor changes that file, not the store. A
  lawyer is listed only where a reviewer verified the admission. Reviewers are
  accounts with the `staff` or `admin` role, granted only by the "Grant role"
  workflow or `pnpm run role:grant`. An attestation never carries a legal name
  in clear; keep `lib/helpers/attest.test.ts` proving it.
- `pnpm dev` signs in on localhost only with `CAUSIUS_DEV_URL=http://localhost:3000`
  (accounts pin their origin; ignored in production). An explicit
  `NEXT_PUBLIC_SITE_URL` configures a deployment/test origin; requests never select it.
  Common account form words come from AccountKit translations; product role
  labels, page copy and mail templates remain in `messages/<locale>.json`.

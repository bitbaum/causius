# Agents

Read `bitbaum/fleet` `AGENTS.md` and the registers it names before inventing a
host, a name, or a page. Do not copy those facts into this file.

Repo-only notes live below this line.

- **The owner's standing instruction (2026-10-11): finish to production.** An
  instruction from the owner is done when it is live on causius.orangecat.ch,
  not when a pull request is open. Merge your own pull request as soon as CI is
  green (`gh api -X PUT repos/bitbaum/causius/pulls/N/merge`), watch the Deploy
  run, and check the live site. This overrides the "agents do not merge by
  hand" line in fleet's auto-merge sweep for this repository. The sweep
  (`auto-merge.yml`) is the fallback, not the plan. After every deploy,
  `live-check.yml` asks the live site from outside whether every language
  answers, the security headers are on and analysis is switched on; a red
  Live check means the product is not working, whatever Deploy said.

- Run: `pnpm install`, `pnpm dev`. Check before pushing: `pnpm run verify`
  (type-check, lint, tests). CI also builds.
- Tests are Vitest, next to the code they test (`lib/*.test.ts`,
  `i18n/parity.test.ts`). They are hermetic. `pnpm run check:analyze` and
  `pnpm run check:agent` call a real model; they need a vendor key and are not
  in CI.
- Every string a reader sees lives in `messages/en.json`, `de.json` and
  `fr.json`; the parity test fails on a missing key. English is the source.
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

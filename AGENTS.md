# Agents

Read `bitbaum/fleet` `AGENTS.md` and the registers it names before inventing a
host, a name, or a page. Do not copy those facts into this file.

Repo-only notes live below this line.

- Run: `pnpm install`, `pnpm dev`. Check before pushing: `pnpm run verify`
  (type-check, lint, tests). CI also builds.
- Tests are Vitest, next to the code they test (`lib/*.test.ts`,
  `i18n/parity.test.ts`). They are hermetic. `pnpm run check:analyze` is the
  one check that calls a real model; it needs a vendor key and is not in CI.
- Every string a reader sees lives in `messages/en.json`, `de.json` and
  `fr.json`; the parity test fails on a missing key. English is the source.
  German uses Swiss spelling (ss, never ß). Link with `@/i18n/navigation`,
  never `next/link`, so a reader on `/de` stays on `/de`.
- **This repository is public and the product handles legal letters.** No real
  person's letter, name, address or reference number goes into the code, the
  tests, the sample case or a commit message. `lib/sample.ts` is invented.
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

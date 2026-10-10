# Causius

Understand an official or legal letter and answer it in time: what it says, what it asks
for, by when. When a person is needed, hand the case to one.

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
- **OrangeCat** is its economy. Helpers are not Causius accounts: they offer
  their help as services on OrangeCat and are paid there. Sign-in, when it
  comes, federates to OrangeCat; Causius keeps no users table.
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
| Tests | Vitest, hermetic (`lib/*.test.ts`) |
| Deploy | PR, CI, auto-merge sweep, deploy to the box |

Not adopted yet, and on the roadmap rather than half-built: `next-intl` (the
interface is English only), OrangeCat sign-in, Drizzle/Postgres (there is no
server-side storage).

## What exists today

- `/` what Causius is
- `/cases/new` intake: paste a letter or add a photo, pick translation languages
- `/cases/[id]` the case: deadline, checklist of what is asked, the letter in each
  language, a draft reply, who should look at it, export
- `/cases` cases in this browser, and import of an exported case file
- `/cases/sample` a worked example with invented personal details
- `/settings` your own model
- `/helpers` the marketplace rules and where a helper lists themselves
- `/roadmap`, `/changelog` the public record
- `POST /api/analyze` letter in, case file out
- `POST /api/model/check` does this key work, and which models can it use

## What does not exist yet

Said plainly, because the pages say it too. `ROADMAP.md` has the order.

- **No helpers are listed.** Nothing pulls in OrangeCat services, labels them or
  checks a lawyer's admission.
- **No accounts and no server-side storage.** A case lives in the browser's
  `localStorage`. Moving it means exporting the file.
- **No shared case room.** Sharing with a helper is handing over the exported file.

## Configuration

The free analysis runs on whichever of the fleet's shared vendor keys this
deployment has. With none of them, `/api/analyze` answers `503 not_configured`
and the intake page offers your own model or filing by hand.

| Variable | Effect |
| --- | --- |
| `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | The shared free chain. Any one switches free analysis on. A photo needs Gemini or OpenRouter: Groq's free models cannot read images. |
| `CAUSIUS_MODEL` | Optional. Start the chain at this model instead of the front. |
| `CAUSIUS_GROQ_MODELS` and the like | Optional per-vendor overrides, read by ai-kit's `freeChain("CAUSIUS")`. |

Limits (per visitor, per hour, in memory): 8 free analyses, 60 on your own key.

## Privacy

A submitted letter is sent to an AI model provider to be read and is not stored
or logged by Causius; only which model served it is logged. The resulting case
is stored only in the visitor's browser, and so is a reader's own API key. This
repository is public: **no real person's letter, name or reference number
belongs in it**, including in tests and the sample.

## The case file

`lib/case.ts` defines `CaseFile`, the one shape the analysis produces, the browser
stores and Export writes. `parseCase` validates anything claiming to be one; both the
model's output and an imported file go through it.

## Design tokens

`app/globals.css` is the only place a colour, font or radius is defined: paper, ink
and one seal red. Contrast against WCAG AA (4.5:1), computed from the OKLCH values
on 2026-10-10. Nothing enforces these, so recompute when a value changes.

| Pair | Light | Dark |
| --- | --- | --- |
| primary text on page / raised | 16.85 / 15.42 | 16.53 / 15.15 |
| secondary text on page / raised | 8.57 / 7.85 | 10.24 / 9.38 |
| muted text on page / raised | 5.58 / 5.11 | 6.64 / 6.08 |
| accent text on page / raised | 6.10 / 5.58 | 8.48 / 7.77 |
| label on primary button | 14.10 | 14.74 |

## Development

```sh
pnpm install
pnpm dev
pnpm run verify   # type-check, lint and tests; CI also builds
```

A green pull request is merged by the fleet's auto-merge sweep, and merging to `main` deploys.

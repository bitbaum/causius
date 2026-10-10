# Causius

Understand an official or legal letter and answer it in time: what it says, what it asks
for, by when. When a person is needed, hand the case to one.

Live at [causius.orangecat.ch](https://causius.orangecat.ch). The idea descends from the
Lex legal assistant sketched in Botsmann: AI for the routine work, and a marketplace of
humans for the rest, for any legal issue in any jurisdiction.

## Three kinds of help

| | Does | Does not |
| --- | --- | --- |
| **Causius AI** | Reads, translates, lists what is asked, drafts a reply | Give legal advice or represent anyone |
| **Legal assistant** (name or pseudonym) | Procedure, gathering evidence, forms, filing, translation | Give legal advice |
| **Licensed lawyer** (real name, bar registration) | Advises and represents, in the jurisdictions they are admitted in | Work outside those jurisdictions |

The line between the last two is set by law in almost every country. It is the one
rule of the product that is not ours to relax.

## What exists today

- `/` what Causius is
- `/cases/new` intake: paste a letter or add a photo, pick translation languages
- `/cases/[id]` the case: deadline, checklist of what is asked, the letter in each
  language, a draft reply, who should look at it, export
- `/cases` cases in this browser, and import of an exported case file
- `/cases/sample` a worked example with invented personal details
- `/helpers` the marketplace rules and how to apply
- `POST /api/analyze` letter in, case file out

## What does not exist yet

Said plainly, because the pages say it too:

- **No helpers are listed.** Applications arrive as GitHub issues; there is no
  verification flow, matching or payment yet.
- **No accounts and no server-side storage.** A case lives in the browser's
  `localStorage`. Moving it means exporting the file.
- **No data room.** Sharing with a helper is handing over the exported file.

## Configuration

| Variable | Effect |
| --- | --- |
| `ANTHROPIC_API_KEY` | Switches AI analysis on. Without it `/api/analyze` answers `503 not_configured` and the intake page offers filing by hand. |
| `CAUSIUS_MODEL` | Model id. Defaults to `claude-sonnet-5-5`. |
| `CAUSIUS_ACCESS_CODE` | When set, analysis requires this code. Set it: an open endpoint spends the key for anyone who finds it. There is no rate limit yet. |

## Privacy

A submitted letter is sent to Anthropic to be read and is not stored by Causius. The
resulting case is stored only in the visitor's browser. This repository is public:
**no real person's letter, name or reference number belongs in it**, including in
tests and the sample.

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
pnpm run verify   # type-check and lint; CI also builds
```

Merging to `main` deploys.

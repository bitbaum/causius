# Changelog

What changed for the people who use Causius, newest first. Every entry comes
from a change merged into this repository; where there is a number in
brackets, it is the pull request to read for the detail.

## 2026-10-11

### Added

- **Matters, worked by an agent.** Sign in with your OrangeCat account and open
  a matter: Causius researches what applies and cites it, records deadlines
  and tasks, drafts documents, and proposes anything that would leave the
  matter (sending, filing, signing, paying) for you to approve. {#matters}
- **Sealed on our host.** Each matter is encrypted with its own key; the
  database alone holds no name, message, deadline or document. Your account
  name is always among the words hidden from the model. {#sealed-matters}
- **Documents in a matter.** Add a PDF or a text file; only its text is kept,
  encrypted. {#documents}
- **Domain names checked with the registries.** Before recommending a name for
  something you are founding, the agent asks the registries whether its
  domains are registered. {#domains}
- **One account across the fleet.** "Create an account" opens OrangeCat's
  screen; the same account opens OrangeCat, Solon and Loki, and the account
  menu links to them. {#sign-in}
- **The fleet's look, and the story behind it.** Causius now wears the shared
  design of OrangeCat, Loki and Solon, with new pages on how it is built, how
  it keeps matters private, and where it sits in the fleet. {#narrative}

- **Your details never reach the model.** Before a letter is sent, your
  browser replaces names, addresses, AHV and IBAN numbers, phone numbers,
  e-mail addresses, dates of birth and reference numbers with placeholders.
  You see every replacement, can add words of your own, and can preview
  exactly what is sent. The real values go back into the result on your
  device. {#anonymise}
- **Cover details on a photo.** Black out your name and address on each page
  before it is sent; what is under the box is removed from the image.
  {#anonymise-photos}
- **An anonymised case file for helpers.** Export a case with your details
  replaced, to hand to a legal assistant or a lawyer. {#anonymise-export}
- **A strict security policy.** The browser runs only scripts the page vouches
  for, sends data only to Causius, and refuses framing. {#security}

### Fixed

- **English pages answered with an error.** Every page now lives under its
  language (`/en`, `/de`, `/fr`), and `/` opens in your browser's language.
 

- **Causius speaks English, German and French.** The whole interface, and what
  an analysis says about your letter, in the language you choose in the header.
  German follows Swiss spelling. [#7] {#languages}
- **Letters of several pages.** Photograph up to four pages in order. Photos are
  made smaller in your browser before they are sent, so a phone picture is no
  longer too large. [#7] {#pages}
- **The deadline shows its source.** Under the reply date is the sentence of the
  letter it was read from, to compare with your own copy. A date the letter does
  not state is never worked out for you. [#7] {#deadline-source}
- **You are told before you start.** The intake page says whether the free
  models are on, and whether they can read photos, before you add a
  letter. [#7] {#shared-models}

## 2026-10-10

### Added

- **Causius reads a letter.** Paste an official letter or add a photo of it and
  get a case: the deadline with the days left, each thing asked of you as a
  checklist, the letter in the languages you chose, and a draft reply to fill
  in. [#7] {#intake} {#case-file}
- **Your case stays with you.** Cases are kept in your browser only. Export one
  as a file to hand to a helper or move to another device, and import it
  again. [#7] {#export}
- **Your own model.** Connect an API key from one of ten providers. The key is
  checked as you paste it, the strongest model it can use is preselected, and
  it is kept in your browser only. [#7] {#own-model}
- **Free shared models, fairly shared.** Without a key, letters are read by the
  fleet's shared free models, a few per hour per visitor. A photo goes only to
  a model that can read one. [#7] {#shared-models}
- **Helpers, and an honest line between them.** What a legal assistant may do,
  what only a licensed lawyer may do, and who may work under a pseudonym.
  Nobody is listed yet, and the page says so. [#7] {#helper-rules}
- **Roadmap and changelog.** Both are kept in the repository and shown on the
  site from the fleet map. [#7] {#records}

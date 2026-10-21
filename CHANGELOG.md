# Changelog

What changed for the people who use Causius, newest first. Every entry comes
from a change merged into this repository; where there is a number in
brackets, it is the pull request to read for the detail.

## 2026-10-21

### Changed

- **A new front page.** It shows instead of telling: an invented letter
  worked through (the name hidden, the deadline found with its source, a
  draft, your decision), the days a letter usually costs against the minutes
  here, the anonymisation drawn as it happens, and an honest comparison with
  a general chatbot and a lawyer. Headlines are set in sentence case. {#front-page}
- **Italian.** The whole site, the account screens and the emails are now
  also in Italian. A letter can be translated into nineteen languages, from
  Albanian to Tigrinya. {#more-languages}
- **Switzerland and Liechtenstein.** Matters and helper profiles can be set in
  Liechtenstein as well as in any canton, and the agent is told what is
  particular to each legal order. {#markets}
- **Choose on sign-up whether you need help or give it.** Both are the same
  account. {#sign-up-role}

### Added

- **Start from a common problem.** Debt collection notice, rent increase, tax
  assessment, dismissal, insurance refused, founding an association: one tap
  tells the agent what has to be established and what to draft, and tells you
  what to have ready. No law is written into them: the agent finds and cites
  the rule and its deadline each time. "Find a helper" from such a matter opens
  the directory on its area. {#workflows}

- **Helpers you can find and ask.** A directory of legal assistants, licensed
  lawyers and AI services, with Causius AI first. Search forgives a typo;
  filter by kind, country, language and area. Nobody is invented: every
  profile is a real account that listed itself. {#helpers}
- **Become a helper.** Any account can list itself, under a name or a
  pseudonym, and still keep matters of its own. "Create a helper account" sits
  on the sign-up page. {#helper-desk}
- **A lawyer checked, and still pseudonymous.** A lawyer submits their
  admission privately; a Causius reviewer checks it in the public register.
  The public then sees a signed attestation (SD-JWT, Ed25519) that names the
  place, never the person, and anyone can check it at /verify or with the key
  at /.well-known/jwks.json. A lawyer is listed only where it was checked.
  {#attestations}
- **Ask a helper about your matter.** You choose what they see: without your
  personal details (the default) or everything. Before sending you read your
  request exactly as they will, and can hide a name the patterns missed. A
  lawyer who accepts gives you the name Causius checked, with proof it is that
  name. Ending it ends their access at once. {#engagements}

### Fixed

- **The account menu's label** no longer shows a formatting error to screen
  readers. {#account-label}

## 2026-10-14

### Changed

- **A look of its own: ink on paper.** Causius is light by default, deep
  ink-indigo on warm paper, with headlines set like an inscription; dark mode
  follows your device or the switch in the header, and your choice is kept in
  this browser. Amber and red stay for deadlines and problems only. {#look}
- **Much less to read.** The home page went from about a thousand words to
  about two hundred and forty: what it is, how it works, why it is private, who
  can help. What is real today and the identity statement moved to the
  platform page; the quick check, the case page, the helpers page and the
  security page were cut by a quarter to a third. {#less-to-read}
- **Header and footer are easier to hit.** Language, theme and footer links
  are all at least 44 by 44 pixels, and nothing runs off the edge of a phone.
  {#nav-contract}

## 2026-10-15

### Added

- **Accounts of your own.** You no longer need an OrangeCat account to use
  Causius. Register with an email address and a password, a sign-in link or a
  passkey; add two-step codes if you like. "Sign in with OrangeCat" stays as
  one button for people who have an account there, and matters you started
  that way are still yours. {#accounts}

## 2026-10-12

### Added

- **Say it, photograph it, attach it.** Starting a matter and writing in one
  use the same message box: a microphone, a camera/photos/files menu, and a
  choice of model. Photos are covered by you in the browser before they are
  read; PDFs and text files are added as they are. {#intake}
- **Speaking, disclosed.** A spoken take goes to a speech service and cannot be
  hidden first. The text comes back for you to edit, and the security page says
  so. {#voice}

### Fixed

- **Hiding personal details is sturdier.** Titles (Dr., Prof.), initials,
  ALL-CAPS names, street and PO-box forms, phone and IBAN variants are now
  caught, and a very long paste can no longer slow the check down. {#redaction}
- **The agent is stricter with what it reads.** Web pages and documents are
  treated as untrusted text, the agent refuses internal addresses, and one
  matter handles one message at a time. {#agent-hardening}
- **The security page says only what is true.** Deadline dates are readable in
  the database, detection is not perfect, and the feedback widget is named.
  {#honest-security}

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

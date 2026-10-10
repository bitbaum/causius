import type { CaseFile } from "./case";

/**
 * The worked example. EVERY PERSONAL DETAIL IN IT IS INVENTED.
 *
 * It is modelled on a real kind of letter — a migration office asking a
 * resident to document time spent abroad — because that is the kind of case
 * Causius exists for: short, formal, in a language the reader may not be
 * comfortable in, with a deadline and a consequence. No real person's name,
 * address or reference number belongs in this repository, which is public.
 */
export const SAMPLE_CASE: CaseFile = {
  version: 1,
  id: "sample",
  title: "Migration office asks for proof of stays abroad",
  jurisdiction: "Switzerland · Canton of Zürich",
  area: "Immigration · residence permit",
  authority: "Cantonal migration office",
  reference: "ZH 0.000.000 (sample)",
  received: "2026-03-02",
  deadline: "2026-03-23",
  summary:
    "After an application concerning a stay abroad, the migration office wants evidence of how much time the applicant spends abroad and in Switzerland, bank statements, an explanation of why they do not work in Switzerland, and a full passport copy.",
  consequence:
    "If nothing is sent by the deadline, the office decides on the documents it already has. The applicant has a legal duty to cooperate (Art. 90 of the Foreign Nationals and Integration Act).",
  asks: [
    {
      id: "a1",
      text: "How often and for how long are you abroad for your self-employed work? Prove it.",
      evidence: ["Flight tickets", "Passport stamps", "Booking confirmations"],
      done: false,
    },
    {
      id: "a2",
      text: "Prove your presence in Switzerland over the period asked about.",
      evidence: [
        "Payslips",
        "Course confirmations",
        "Medical certificates",
        "Mobile phone bills",
        "Public transport passes",
      ],
      done: false,
    },
    {
      id: "a3",
      text: "Bank statements showing account movements for the period.",
      evidence: ["Statements from every account you use, complete months"],
      done: false,
    },
    {
      id: "a4",
      text: "Explain in detail why you are not working in Switzerland.",
      evidence: ["A written statement in your own words", "Anything that supports it"],
      done: false,
    },
    {
      id: "a5",
      text: "Full copy of your passport, every page.",
      evidence: ["All pages, including empty ones"],
      done: false,
    },
  ],
  texts: [
    {
      lang: "de",
      label: "Original (German)",
      text: "Anfrage Auslandaufenthalt\n\nSehr geehrte Frau Muster\n\nWir beziehen uns auf Ihr Gesuch. Zur Behandlung benötigen wir noch folgende zusätzliche Angaben bzw. Unterlagen:\n\n1. Gemäss Ihren Angaben im Gesuch seien Sie im Ausland selbständig. Wie oft und wie lange halten Sie sich jeweils im Ausland auf? Bitte belegen Sie Ihre Angaben (Flugtickets, Passeinträge, Buchungsbestätigungen etc.).\n1.1. Bitte belegen Sie ebenfalls Ihre Anwesenheit in der Schweiz (Lohnabrechnungen, Kursbestätigungen, Arztzeugnisse, Handyrechnungen, Abonnemente für den öffentlichen Verkehr etc.).\n2. Bankkontoauszüge, aus denen Ihre Kontobewegungen hervorgehen.\n3. Weshalb sind Sie nicht in der Schweiz erwerbstätig? Bitte ausführlich begründen.\n4. Vollständige Passkopie (alle Seiten).\n\nBitte beantworten Sie unser Schreiben innert Frist. Gemäss Art. 90 AIG sind Sie verpflichtet, uns alle relevanten Informationen zu liefern. Ohne Ihre Rückmeldung entscheiden wir aufgrund der vorhandenen Akten.",
    },
    {
      lang: "en",
      label: "English",
      text: "Enquiry about a stay abroad\n\nDear Ms Muster\n\nWe refer to your application. To process it we still need the following information and documents:\n\n1. According to your application you are self-employed abroad. How often, and for how long each time, do you stay abroad? Please provide evidence (flight tickets, passport stamps, booking confirmations, etc.).\n1.1. Please also prove your presence in Switzerland (payslips, course confirmations, medical certificates, mobile phone bills, public transport passes, etc.).\n2. Bank statements showing your account movements.\n3. Why are you not working in Switzerland? Please explain in detail.\n4. Complete copy of your passport (all pages).\n\nPlease reply by the deadline. Under Art. 90 FNIA you are obliged to give us all relevant information. Without a reply we will decide on the basis of the existing file.",
    },
  ],
  draftReply: {
    lang: "de",
    label: "Draft reply (German)",
    text: "Betreff: Ihre Anfrage Auslandaufenthalt – Ref. [Referenznummer]\n\nSehr geehrte Damen und Herren\n\nIch beziehe mich auf Ihr Schreiben vom [Datum] und reiche Ihnen die verlangten Angaben und Unterlagen ein.\n\n1. Aufenthalte im Ausland\n[Wie oft und wie lange, mit Daten. Tabelle der Reisen beilegen.]\nBeilagen: [Flugtickets, Passeinträge, Buchungsbestätigungen]\n\n1.1 Anwesenheit in der Schweiz\n[Zeiträume in der Schweiz.]\nBeilagen: [Belege]\n\n2. Bankkontoauszüge\nBeilage: Kontoauszüge [Bank], [Zeitraum].\n\n3. Erwerbstätigkeit\n[Ihre eigene, wahrheitsgetreue Begründung.]\n\n4. Passkopie\nBeilage: vollständige Kopie meines Passes (alle Seiten).\n\nFür Rückfragen stehe ich Ihnen gerne zur Verfügung.\n\nFreundliche Grüsse\n[Name, Adresse, Unterschrift]",
  },
  notes: [
    "Send the reply by registered post or hand it in against a receipt, and keep a copy of everything.",
    "If you cannot gather everything in time, ask the office in writing for an extension before the deadline, and say why.",
    "Everything you state must be true and consistent with your application. If your time abroad is long, the permit itself may be at stake.",
  ],
  recommendedTier: "lawyer",
  tierReason:
    "The answers decide whether a residence permit continues. A licensed lawyer should read the explanation of the stays abroad before it is sent.",
  createdAt: "2026-03-02T09:00:00.000Z",
};

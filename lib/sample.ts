import type { Locale } from "@/i18n/routing";
import type { CaseFile } from "./case";

/**
 * The worked example. EVERY PERSONAL DETAIL IN IT IS INVENTED.
 *
 * It is modelled on a real kind of letter — a migration office asking a
 * resident to document time spent abroad — because that is the kind of case
 * Causius exists for: short, formal, in a language the reader may not be
 * comfortable in, with a deadline and a consequence. No real person's name,
 * address or reference number belongs in this repository, which is public.
 *
 * The letter itself is one fixed German text; what Causius says ABOUT it is
 * written per reader language, exactly as a real analysis would be. The same
 * German text is what `pnpm run check:analyze` sends to a real model.
 */
export const SAMPLE_LETTER = `Anfrage Auslandaufenthalt

2. März 2026

Sehr geehrte Frau Muster

Wir beziehen uns auf Ihr Gesuch. Zur Behandlung benötigen wir noch folgende zusätzliche Angaben bzw. Unterlagen:

1. Gemäss Ihren Angaben im Gesuch seien Sie im Ausland selbständig. Wie oft und wie lange halten Sie sich jeweils im Ausland auf? Bitte belegen Sie Ihre Angaben (Flugtickets, Passeinträge, Buchungsbestätigungen etc.).
1.1. Bitte belegen Sie ebenfalls Ihre Anwesenheit in der Schweiz (Lohnabrechnungen, Kursbestätigungen, Arztzeugnisse, Handyrechnungen, Abonnemente für den öffentlichen Verkehr etc.).
2. Bankkontoauszüge, aus denen Ihre Kontobewegungen hervorgehen.
3. Weshalb sind Sie nicht in der Schweiz erwerbstätig? Bitte ausführlich begründen.
4. Vollständige Passkopie (alle Seiten).

Bitte beantworten Sie unser Schreiben bis am 23. März 2026. Gemäss Art. 90 AIG sind Sie verpflichtet, uns alle relevanten Informationen zu liefern. Ohne Ihre Rückmeldung entscheiden wir aufgrund der vorhandenen Akten.

Freundliche Grüsse
Kantonales Migrationsamt`;

/** The deadline the sample letter states, for the live check to compare against. */
export const SAMPLE_DEADLINE = "2026-03-23";
const DEADLINE_QUOTE = "Bitte beantworten Sie unser Schreiben bis am 23. März 2026.";

const EN_TEXT = `Enquiry about a stay abroad

2 March 2026

Dear Ms Muster

We refer to your application. To process it we still need the following information and documents:

1. According to your application you are self-employed abroad. How often, and for how long each time, do you stay abroad? Please provide evidence (flight tickets, passport stamps, booking confirmations, etc.).
1.1. Please also prove your presence in Switzerland (payslips, course confirmations, medical certificates, mobile phone bills, public transport passes, etc.).
2. Bank statements showing your account movements.
3. Why are you not working in Switzerland? Please explain in detail.
4. Complete copy of your passport (all pages).

Please reply by 23 March 2026. Under Art. 90 FNIA you are obliged to give us all relevant information. Without a reply we will decide on the basis of the existing file.

Kind regards
Cantonal migration office`;

const FR_TEXT = `Demande de renseignements concernant un séjour à l'étranger

2 mars 2026

Madame,

Nous nous référons à votre demande. Pour pouvoir la traiter, nous avons encore besoin des informations et documents suivants :

1. Selon les indications figurant dans votre demande, vous exercez une activité indépendante à l'étranger. À quelle fréquence et pour quelle durée séjournez-vous à chaque fois à l'étranger ? Veuillez justifier vos indications (billets d'avion, tampons dans le passeport, confirmations de réservation, etc.).
1.1. Veuillez également prouver votre présence en Suisse (décomptes de salaire, attestations de cours, certificats médicaux, factures de téléphone portable, abonnements de transports publics, etc.).
2. Relevés de compte bancaire faisant apparaître vos mouvements de compte.
3. Pourquoi n'exercez-vous pas d'activité lucrative en Suisse ? Veuillez motiver votre réponse de manière détaillée.
4. Copie complète du passeport (toutes les pages).

Nous vous prions de répondre à notre courrier d'ici au 23 mars 2026. Conformément à l'art. 90 LEI, vous êtes tenue de nous fournir toutes les informations pertinentes. Sans réponse de votre part, nous statuerons sur la base du dossier existant.

Meilleures salutations
Office cantonal des migrations`;

const DRAFT_REPLY = `Betreff: Ihre Anfrage Auslandaufenthalt – Ref. [Referenznummer]

Sehr geehrte Damen und Herren

Ich beziehe mich auf Ihr Schreiben vom 2. März 2026 und reiche Ihnen die verlangten Angaben und Unterlagen ein.

1. Aufenthalte im Ausland
[Wie oft und wie lange, mit Daten. Tabelle der Reisen beilegen.]
Beilagen: [Flugtickets, Passeinträge, Buchungsbestätigungen]

1.1 Anwesenheit in der Schweiz
[Zeiträume in der Schweiz.]
Beilagen: [Belege]

2. Bankkontoauszüge
Beilage: Kontoauszüge [Bank], [Zeitraum].

3. Erwerbstätigkeit
[Ihre eigene, wahrheitsgetreue Begründung.]

4. Passkopie
Beilage: vollständige Kopie meines Passes (alle Seiten).

Für Rückfragen stehe ich Ihnen gerne zur Verfügung.

Freundliche Grüsse
[Name, Adresse, Unterschrift]`;

interface Told {
  title: string;
  jurisdiction: string;
  area: string;
  authority: string;
  reference: string;
  summary: string;
  consequence: string;
  asks: { text: string; evidence: string[] }[];
  notes: string[];
  tierReason: string;
}

const TOLD: Record<Locale, Told> = {
  en: {
    title: "Migration office asks for proof of stays abroad",
    jurisdiction: "Switzerland · Canton of Zürich",
    area: "Immigration · residence permit",
    authority: "Cantonal migration office",
    reference: "ZH 0.000.000 (sample)",
    summary:
      "After an application concerning a stay abroad, the migration office wants evidence of how much time the applicant spends abroad and in Switzerland, bank statements, an explanation of why they do not work in Switzerland, and a full passport copy.",
    consequence:
      "If nothing is sent by the deadline, the office decides on the documents it already has. The applicant has a legal duty to cooperate (Art. 90 of the Foreign Nationals and Integration Act).",
    asks: [
      {
        text: "How often and for how long are you abroad for your self-employed work? Prove it.",
        evidence: ["Flight tickets", "Passport stamps", "Booking confirmations"],
      },
      {
        text: "Prove your presence in Switzerland.",
        evidence: [
          "Payslips",
          "Course confirmations",
          "Medical certificates",
          "Mobile phone bills",
          "Public transport passes",
        ],
      },
      {
        text: "Bank statements showing your account movements.",
        evidence: ["Statements from every account you use, complete months"],
      },
      {
        text: "Explain in detail why you are not working in Switzerland.",
        evidence: ["A written statement in your own words", "Anything that supports it"],
      },
      {
        text: "Full copy of your passport, every page.",
        evidence: ["All pages, including empty ones"],
      },
    ],
    notes: [
      "Send the reply by registered post or hand it in against a receipt, and keep a copy of everything.",
      "If you cannot gather everything in time, ask the office in writing for an extension before the deadline, and say why.",
      "Everything you state must be true and consistent with your application. If your time abroad is long, the permit itself may be at stake.",
    ],
    tierReason:
      "The answers decide whether a residence permit continues. A licensed lawyer should read the explanation of the stays abroad before it is sent.",
  },
  de: {
    title: "Migrationsamt verlangt Belege zu Auslandaufenthalten",
    jurisdiction: "Schweiz · Kanton Zürich",
    area: "Migrationsrecht · Aufenthaltsbewilligung",
    authority: "Kantonales Migrationsamt",
    reference: "ZH 0.000.000 (Beispiel)",
    summary:
      "Nach einem Gesuch zu einem Auslandaufenthalt verlangt das Migrationsamt Belege dazu, wie viel Zeit die Gesuchstellerin im Ausland und in der Schweiz verbringt, Bankkontoauszüge, eine Begründung, weshalb sie in der Schweiz nicht erwerbstätig ist, und eine vollständige Passkopie.",
    consequence:
      "Geht bis zur Frist nichts ein, entscheidet das Amt aufgrund der vorhandenen Akten. Es besteht eine gesetzliche Mitwirkungspflicht (Art. 90 Ausländer- und Integrationsgesetz).",
    asks: [
      {
        text: "Wie oft und wie lange sind Sie für Ihre selbständige Tätigkeit im Ausland? Belegen Sie es.",
        evidence: ["Flugtickets", "Passeinträge", "Buchungsbestätigungen"],
      },
      {
        text: "Belegen Sie Ihre Anwesenheit in der Schweiz.",
        evidence: [
          "Lohnabrechnungen",
          "Kursbestätigungen",
          "Arztzeugnisse",
          "Handyrechnungen",
          "ÖV-Abonnemente",
        ],
      },
      {
        text: "Bankkontoauszüge, aus denen Ihre Kontobewegungen hervorgehen.",
        evidence: ["Auszüge aller Konten, die Sie benutzen, vollständige Monate"],
      },
      {
        text: "Begründen Sie ausführlich, weshalb Sie in der Schweiz nicht erwerbstätig sind.",
        evidence: ["Eine schriftliche Erklärung in eigenen Worten", "Alles, was sie stützt"],
      },
      {
        text: "Vollständige Kopie Ihres Passes, jede Seite.",
        evidence: ["Alle Seiten, auch die leeren"],
      },
    ],
    notes: [
      "Schicken Sie die Antwort eingeschrieben oder geben Sie sie gegen Quittung ab, und behalten Sie von allem eine Kopie.",
      "Können Sie nicht alles rechtzeitig beschaffen, verlangen Sie vor Ablauf der Frist schriftlich eine Fristerstreckung und begründen Sie sie.",
      "Alle Angaben müssen wahr sein und zu Ihrem Gesuch passen. Sind Sie lange im Ausland, kann die Bewilligung selbst auf dem Spiel stehen.",
    ],
    tierReason:
      "Die Antworten entscheiden darüber, ob eine Aufenthaltsbewilligung bestehen bleibt. Eine zugelassene Anwältin oder ein zugelassener Anwalt sollte die Erklärung zu den Auslandaufenthalten lesen, bevor sie abgeschickt wird.",
  },
  fr: {
    title: "L'office des migrations demande des preuves de séjours à l'étranger",
    jurisdiction: "Suisse · canton de Zurich",
    area: "Droit des migrations · autorisation de séjour",
    authority: "Office cantonal des migrations",
    reference: "ZH 0.000.000 (exemple)",
    summary:
      "À la suite d'une demande concernant un séjour à l'étranger, l'office des migrations veut des preuves du temps que la requérante passe à l'étranger et en Suisse, des relevés bancaires, une explication des raisons pour lesquelles elle ne travaille pas en Suisse et une copie complète du passeport.",
    consequence:
      "Si rien n'est envoyé dans le délai, l'office statue sur la base du dossier existant. La requérante a une obligation légale de collaborer (art. 90 de la loi sur les étrangers et l'intégration).",
    asks: [
      {
        text: "À quelle fréquence et pour quelle durée êtes-vous à l'étranger pour votre activité indépendante ? Prouvez-le.",
        evidence: ["Billets d'avion", "Tampons dans le passeport", "Confirmations de réservation"],
      },
      {
        text: "Prouvez votre présence en Suisse.",
        evidence: [
          "Décomptes de salaire",
          "Attestations de cours",
          "Certificats médicaux",
          "Factures de téléphone portable",
          "Abonnements de transports publics",
        ],
      },
      {
        text: "Relevés bancaires faisant apparaître vos mouvements de compte.",
        evidence: ["Les relevés de tous les comptes que vous utilisez, par mois complets"],
      },
      {
        text: "Expliquez en détail pourquoi vous ne travaillez pas en Suisse.",
        evidence: ["Une déclaration écrite avec vos propres mots", "Tout ce qui l'appuie"],
      },
      {
        text: "Copie complète de votre passeport, toutes les pages.",
        evidence: ["Toutes les pages, y compris les pages vides"],
      },
    ],
    notes: [
      "Envoyez la réponse par courrier recommandé ou remettez-la contre quittance, et gardez une copie de tout.",
      "Si vous ne pouvez pas tout réunir à temps, demandez par écrit une prolongation du délai avant son échéance, en indiquant pourquoi.",
      "Tout ce que vous déclarez doit être vrai et cohérent avec votre demande. Si vos séjours à l'étranger sont longs, l'autorisation elle-même peut être en jeu.",
    ],
    tierReason:
      "Les réponses décident du maintien d'une autorisation de séjour. Une avocate ou un avocat inscrit au barreau devrait lire l'explication des séjours à l'étranger avant son envoi.",
  },
  it: {
    title: "L'Ufficio della migrazione chiede prove dei soggiorni all'estero",
    jurisdiction: "Svizzera · Cantone di Zurigo",
    area: "Diritto della migrazione · permesso di dimora",
    authority: "Ufficio cantonale della migrazione",
    reference: "ZH 0.000.000 (esempio)",
    summary:
      "In seguito a una domanda relativa a un soggiorno all'estero, l'Ufficio della migrazione chiede prove di quanto tempo la richiedente trascorre all'estero e in Svizzera, estratti conto bancari, una spiegazione del motivo per cui non lavora in Svizzera e una copia completa del passaporto.",
    consequence:
      "Se entro il termine non arriva nulla, l'Ufficio decide sulla base degli atti di cui dispone. La richiedente ha un obbligo legale di collaborare (art. 90 della legge federale sugli stranieri e la loro integrazione).",
    asks: [
      {
        text: "Con quale frequenza e per quanto tempo si trova all'estero per la sua attività indipendente? Lo provi.",
        evidence: ["Biglietti aerei", "Timbri sul passaporto", "Conferme di prenotazione"],
      },
      {
        text: "Provi la sua presenza in Svizzera.",
        evidence: [
          "Conteggi salariali",
          "Attestati di corsi",
          "Certificati medici",
          "Fatture del telefono cellulare",
          "Abbonamenti dei trasporti pubblici",
        ],
      },
      {
        text: "Estratti conto bancari che mostrino i movimenti dei suoi conti.",
        evidence: ["Estratti di tutti i conti che usa, per mesi completi"],
      },
      {
        text: "Spieghi in dettaglio perché non lavora in Svizzera.",
        evidence: ["Una dichiarazione scritta con parole sue", "Tutto ciò che la sostiene"],
      },
      {
        text: "Copia completa del suo passaporto, tutte le pagine.",
        evidence: ["Tutte le pagine, anche quelle vuote"],
      },
    ],
    notes: [
      "Invii la risposta per raccomandata o la consegni contro ricevuta, e conservi una copia di tutto.",
      "Se non riesce a raccogliere tutto in tempo, chieda per scritto una proroga del termine prima della scadenza, indicandone il motivo.",
      "Tutto ciò che dichiara deve essere vero e coerente con la sua domanda. Se i suoi soggiorni all'estero sono lunghi, può essere in gioco il permesso stesso.",
    ],
    tierReason:
      "Le risposte decidono se un permesso di dimora viene mantenuto. Un'avvocata o un avvocato abilitato dovrebbe leggere la spiegazione dei soggiorni all'estero prima che venga inviata.",
  },
};

const ORIGINAL = { lang: "de", label: "Deutsch (Original)", text: SAMPLE_LETTER };
const TRANSLATIONS = [
  { lang: "en", label: "English", text: EN_TEXT },
  { lang: "fr", label: "Français", text: FR_TEXT },
];

export function sampleCase(locale: Locale): CaseFile {
  const told = TOLD[locale];
  return {
    version: 1,
    id: "sample",
    title: told.title,
    jurisdiction: told.jurisdiction,
    area: told.area,
    authority: told.authority,
    reference: told.reference,
    received: "2026-03-02",
    deadline: SAMPLE_DEADLINE,
    deadlineQuote: DEADLINE_QUOTE,
    summary: told.summary,
    consequence: told.consequence,
    asks: told.asks.map((ask, i) => ({ id: `a${i + 1}`, ...ask, done: false })),
    // The original first, then the reader's own language before the other one.
    texts: [
      ORIGINAL,
      ...TRANSLATIONS.filter((t) => t.lang === locale),
      ...TRANSLATIONS.filter((t) => t.lang !== locale),
    ],
    draftReply: { lang: "de", label: "Deutsch", text: DRAFT_REPLY },
    notes: told.notes,
    recommendedTier: "lawyer",
    tierReason: told.tierReason,
    createdAt: "2026-03-02T09:00:00.000Z",
    redactions: [],
  };
}

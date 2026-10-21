/**
 * Repeatable workflows: the common problems people bring, each a way to start
 * a matter that already knows what has to be established.
 *
 * NO LAW LIVES HERE. Not a deadline, not an article number, not an amount.
 * A brief says what the agent must FIND OUT and what it must produce; the rule
 * itself is researched and cited each time (agent SYSTEM prompt), so a brief
 * cannot go stale when the law changes, and Solon can later supply the rules as
 * data. What the person reads (name, what to have ready) is in messages/*.json
 * under `Workflows`, keyed by id.
 */
export const WORKFLOWS = [
  {
    id: "debt-collection",
    area: "debt",
    brief:
      "The person received a payment order or similar debt-collection notice. First establish the exact date it was served and whether the claim is owed in full, in part or not at all. Research the objection procedure and its deadline in this jurisdiction from the official source, record the deadline with record_deadline quoting its source, and say plainly how to object (how, where, in what form). If they dispute the claim, draft the objection; if they owe it, explain the options to pay or agree instalments. Propose filing with request_approval.",
  },
  {
    id: "rent-increase",
    area: "tenancy",
    brief:
      "The person's landlord announced a rent increase or other change to the lease. Ask for the notice and the lease. Research whether the notice is valid in form (official form, reasons given), the grounds the law allows for an increase, and the deadline and authority for contesting it in this jurisdiction, each with a cited official source. Record the deadline. If contesting is worth it, draft the submission to the competent conciliation authority; propose filing with request_approval.",
  },
  {
    id: "tax-assessment",
    area: "tax",
    brief:
      "The person received a tax assessment they think is wrong. Ask for the assessment and the return it was based on. Identify which tax and which level (federal, cantonal, communal) it concerns, find each difference between return and assessment, research the objection deadline and form in this jurisdiction with a cited official source, and record the deadline. Draft the objection with reasons for each disputed item; propose filing with request_approval.",
  },
  {
    id: "dismissal",
    area: "employment",
    brief:
      "The person was dismissed or fears dismissal. Establish the dates (contract start, notice given, notice received), the contract terms and any illness, accident, pregnancy or military service. Research the notice period, protected periods, and the rules on abusive dismissal and the deadline to object to it in this jurisdiction, each with a cited source. Record every deadline. Draft what is needed (written objection, request for reasons, certificate of employment); propose sending with request_approval.",
  },
  {
    id: "insurance-refusal",
    area: "social",
    brief:
      "An insurer refused or cut a payment. Ask for the decision and the policy or the relevant social-insurance law. Identify whether it is private insurance or social insurance and research the remedy and its deadline accordingly, with a cited source. Record the deadline. Draft the objection or complaint with the facts and reasons; propose sending with request_approval.",
  },
  {
    id: "association",
    area: "company",
    brief:
      "The person wants to found an association (or similar non-profit body). Ask for its name, purpose, seat and founders. Research the minimum legal requirements for statutes and founding in this jurisdiction with cited sources, check the name's domains with check_domain, and draft the statutes and the founding minutes. Registration, if it is required or wanted, is a step for the person: propose it with request_approval.",
  },
] as const;

export type Workflow = (typeof WORKFLOWS)[number];
export type WorkflowId = Workflow["id"];
export const WORKFLOW_IDS = WORKFLOWS.map((w) => w.id) as [WorkflowId, ...WorkflowId[]];

export function workflowById(id: string | undefined): Workflow | undefined {
  return WORKFLOWS.find((w) => w.id === id);
}

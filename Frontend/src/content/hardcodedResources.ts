import type { ResourceCardRow, ResourceDetailRow } from "@/hooks/queries/resources";

export const ADVISORS_PLAYBOOK_SLUG = "the-advisors-playbook";
export const ADVISORS_PLAYBOOK_URL =
  "https://docs.google.com/presentation/d/1UAq9-q98lLzDTcE4j5e5ruaoKtKcwxdS-6DwuJ0X8TQ/mobilepresent?slide=id.g3f835578822_2_3";

const card: ResourceCardRow = {
  id: "hardcoded-advisors-playbook",
  title: "The Advisor's Playbook: Build a Winning Business Plan",
  slug: ADVISORS_PLAYBOOK_SLUG,
  type: "playbook",
  category: "Business planning",
  excerpt: "A practical blueprint for turning your business model into a plan that attracts grants, investors and the right partners.",
  cover_image_url: null,
  file_url: ADVISORS_PLAYBOOK_URL,
  file_name: "The Advisor's Playbook · Google Slides",
  file_size_kb: null,
  topics: ["Business planning", "Business model canvas", "Grants", "Investors"],
  gated: true,
  featured: true,
  read_time_min: 25,
  view_count: 0,
  download_count: 0,
  published_at: "2026-08-23T00:00:00.000Z",
};

export const HARD_CODED_RESOURCE: ResourceDetailRow = {
  ...card,
  author_name: "Belinda Nkechi Idinmachi",
  created_at: "2026-08-23T00:00:00.000Z",
  content: `## Start with the business model

Before a business plan can persuade anyone else, the business model has to make sense to you. Use this playbook to work through the nine building blocks of a clear, fundable business.

## The nine blocks

1. **Customer segments** — Who exactly are you serving, and which segment matters most right now?
2. **Value proposition** — What urgent problem do you solve, and why is your solution the right fit?
3. **Channels** — How will customers discover, buy and receive your offer?
4. **Customer relationships** — What experience will turn a first transaction into loyalty?
5. **Revenue streams** — What do customers pay for, how often, and at what price?
6. **Key resources** — Which people, assets, technology and capital make delivery possible?
7. **Key activities** — What must you do consistently to create and deliver value?
8. **Key partners** — Who can help you reach customers, reduce risk or grow faster?
9. **Cost structure** — What will it cost to operate, acquire customers and fulfil demand?

## Turn the canvas into a funding-ready plan

Make the story easy to follow: define the problem, show who experiences it, explain your solution, share evidence of demand, make the economics visible, and state exactly how funding will be used.

Remember that a grant panel and an investor are different readers. Match the language, evidence and ask to the decision-maker in front of you.

## Before you submit

- Fill every block honestly; vague answers create vague plans.
- Support assumptions with customer conversations, sales data or test results.
- Show the next milestone the funding will unlock.
- Revisit the canvas every quarter. It is a living document, not a launch document.

> Your business model must make sense to you before it can convince anyone else.

Open the full workshop deck after signing in to work through the exercise.`
};

export const HARD_CODED_RESOURCES: ResourceCardRow[] = [card];

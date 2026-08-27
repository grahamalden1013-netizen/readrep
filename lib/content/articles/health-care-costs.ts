import type { Article } from "@/types/ngn";

export const healthCareCosts: Article = {
  id: "art-health-costs",
  slug: "why-american-health-care-costs-what-it-does",
  headline: "Why Nobody Can Tell You What a Hospital Visit Costs",
  subheadline:
    "American health care runs on prices that are negotiated privately, vary by insurer, and are often unknown to the patient and the doctor alike. That design choice drives most of the policy debate.",
  summary:
    "Health care costs in the United States are shaped by a fragmented payment system in which prices differ by payer. Reform proposals largely differ in how much they change that structure.",
  inTwentySeconds:
    "In most of the economy, a thing has a price. In American health care, the same procedure at the same hospital can carry different prices depending on who is paying — Medicare, Medicaid, a private insurer, or you. Almost every major health policy proposal is an argument about how much of that structure to change: cover more people inside it, regulate the prices within it, or replace it.",
  category: "health",
  issueSlugs: ["healthcare"],
  quickWhatHappened:
    "Coverage rules, drug pricing authority and price transparency requirements continue to move through Congress, agencies and the courts, without a change to the underlying multi-payer structure.",
  quickWhyItMatters:
    "Health costs affect wages, since employer premiums come out of total compensation, and they are a leading factor in household debt.",
  quickWhatNext:
    "Watch three things: whether enhanced marketplace subsidies are extended, how drug price negotiation authority is implemented, and whether price transparency rules are enforced.",
  body: [
    {
      heading: "Who pays for care",
      paragraphs: [
        "There is no single American health system. There are several, running side by side.",
        "Most working-age people are covered through an employer. Medicare covers people 65 and older and some people with disabilities. Medicaid, run jointly by states and the federal government, covers people with low incomes and varies substantially by state. Individual marketplaces created under the Affordable Care Act cover people without employer or public coverage. Some people have no coverage at all.",
        "Each payer negotiates prices separately. That is why the same service can carry different prices in the same building on the same day.",
      ],
    },
    {
      heading: "Why premiums are part of your paycheck",
      paragraphs: [
        "Employer coverage is usually described as a benefit, which obscures the economics. Economists generally treat employer premium contributions as part of total compensation — money that would otherwise be available as wages.",
        "This is one reason health costs are an economic issue as much as a health one: when premiums rise faster than productivity, wage growth absorbs part of the difference.",
        "It also explains why coverage is tied to employment at all. That link began as a workaround during wartime wage controls and became permanent through the tax code, which excludes employer-paid premiums from taxable income.",
      ],
    },
    {
      heading: "What the main proposals actually change",
      paragraphs: [
        "Health policy debates are easier to follow when sorted by how much structural change they involve.",
      ],
      bullets: [
        "Coverage expansion: subsidize more people into the existing system through marketplace subsidies or Medicaid expansion. Leaves the payment structure intact.",
        "Price regulation: set or negotiate prices for specific services or drugs, particularly within Medicare. Changes what payers pay without changing who pays.",
        "Transparency and competition: require hospitals and insurers to publish prices, on the theory that visible prices create pressure. Effects depend heavily on enforcement.",
        "Single-payer or public option: replace or compete with private insurance through a government plan. The largest structural change, and the most contested.",
      ],
    },
  ],
  democraticView: {
    label: "Many Democratic officials",
    summary:
      "A common position among Democratic lawmakers is to expand coverage through existing programs and give the government more power to negotiate prices.",
    points: [
      "Generally support extending marketplace subsidies and encouraging remaining states to expand Medicaid.",
      "Support Medicare drug price negotiation and caps on out-of-pocket costs for specific drugs.",
      "The party contains real disagreement between members favoring incremental expansion and members supporting single-payer coverage.",
    ],
  },
  republicanView: {
    label: "Many Republican officials",
    summary:
      "A common position among Republican lawmakers emphasizes competition, price transparency and state flexibility rather than federal coverage expansion.",
    points: [
      "Frequently support health savings accounts and plans with wider variation in benefits and price.",
      "Emphasize price transparency enforcement as a market-based cost control.",
      "Often favor block grants or waivers giving states more control over Medicaid design.",
    ],
  },
  otherViews: [
    {
      label: "Hospitals and physician groups",
      summary:
        "Provider organizations focus on payment rates and staffing rather than coverage structure.",
      points: [
        "Argue that public program payment rates are below the cost of delivering care, which shifts costs to private insurers.",
        "Rural hospital associations warn that reimbursement changes fall hardest on facilities with thin margins.",
      ],
    },
    {
      label: "Health economists",
      summary:
        "Researchers broadly agree on the diagnosis while disagreeing about remedies.",
      points: [
        "There is wide agreement that the United States pays higher prices for comparable services than peer countries, rather than simply using more care.",
        "There is genuine disagreement about how much price regulation would affect innovation and supply.",
      ],
    },
    {
      label: "Patient advocacy organizations",
      summary:
        "These groups concentrate on the parts of the system that are invisible in aggregate statistics.",
      points: [
        "Emphasize surprise billing, prior authorization delays and network adequacy as day-to-day problems distinct from premium levels.",
        "Note that medical debt affects insured people, not only uninsured ones.",
      ],
    },
  ],
  knownFacts: [
    "The United States uses a mixed system of employer coverage, Medicare, Medicaid, individual marketplaces and uninsured care.",
    "Medicaid is jointly financed by states and the federal government, and eligibility rules vary by state.",
    "Employer-paid health premiums are excluded from taxable income under the federal tax code.",
    "Prices for the same service can differ by payer at the same facility.",
    "Federal rules require hospitals and insurers to publish certain price information.",
  ],
  uncertainties: [
    "How much published price data changes consumer or employer behavior is not yet clear.",
    "Long-run effects of drug price negotiation on research investment are disputed among economists.",
    "Projected costs of large structural proposals vary widely depending on assumptions about payment rates and utilization.",
  ],
  keyTerms: [
    {
      term: "Premium",
      definition:
        "The recurring amount paid for insurance coverage, often split between an employer and an employee.",
    },
    {
      term: "Deductible",
      definition:
        "The amount a patient pays out of pocket before insurance begins covering most costs.",
    },
    {
      term: "Medicaid",
      definition:
        "A joint federal-state program covering people with low incomes. Eligibility and benefits vary by state.",
    },
    {
      term: "Public option",
      definition:
        "A government-run insurance plan offered alongside private plans rather than replacing them.",
    },
    {
      term: "Prior authorization",
      definition:
        "An insurer requirement that a treatment be approved before it is provided in order to be covered.",
    },
  ],
  sources: [
    {
      id: "src-cms",
      publisher: "Centers for Medicare & Medicaid Services",
      title: "National Health Expenditure Accounts",
      date: "Annual",
      url: "#",
      kind: "data",
      isPlaceholder: true,
    },
    {
      id: "src-cbo-health",
      publisher: "Congressional Budget Office",
      title: "Health insurance coverage projections",
      date: "Annual",
      url: "#",
      kind: "analysis",
      isPlaceholder: true,
    },
    {
      id: "src-hhs-transparency",
      publisher: "U.S. Department of Health and Human Services",
      title: "Hospital price transparency rule",
      date: "Regulation",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
  ],
  authorId: "sam-reyes",
  type: "explainer",
  status: "published",
  publishedAt: "2026-08-24T09:30:00.000Z",
  updatedAt: "2026-08-24T09:30:00.000Z",
  readTime: 6,
  cover: { pattern: "arc", hue: 350 },
  featured: false,
  significance: 74,
  isDemo: true,
};

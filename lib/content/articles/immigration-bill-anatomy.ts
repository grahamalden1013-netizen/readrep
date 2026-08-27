import type { Article } from "@/types/ngn";

export const immigrationBillAnatomy: Article = {
  id: "art-immigration-anatomy",
  slug: "what-is-actually-inside-an-immigration-bill",
  headline: "What Is Actually Inside an Immigration Bill",
  subheadline:
    "Immigration legislation is usually described in one word — tough, humane, comprehensive. The text is always made of the same handful of moving parts.",
  summary:
    "Most immigration proposals combine changes to enforcement, asylum procedure, legal immigration levels and status for people already in the country. Knowing the four parts makes any bill readable.",
  inTwentySeconds:
    "Immigration bills are modular. Almost every one adjusts some combination of four things: border enforcement resources, the asylum process, how many people can immigrate legally and through what categories, and what happens to people already living in the country without permanent status. Political fights usually come from trading between those four — not from disagreement about all of them at once.",
  category: "immigration",
  issueSlugs: ["immigration"],
  quickWhatHappened:
    "Immigration proposals recur in Congress with similar structures. Comprehensive packages have repeatedly stalled, while narrower measures move more often.",
  quickWhyItMatters:
    "Immigration policy affects the labor force, local school and hospital budgets, families with mixed immigration status, and the operation of the border itself. It is also one of the most consistently misdescribed policy areas.",
  quickWhatNext:
    "Watch whether a proposal moves as one comprehensive package or as separate bills. Separated bills pass more often; comprehensive packages are how each side protects its priorities from being dropped.",
  body: [
    {
      heading: "The four parts",
      paragraphs: [
        "Immigration law is federal. Congress writes it, executive agencies carry it out, and courts review it. Nearly every proposal is a mix of these components:",
      ],
      bullets: [
        "Enforcement: funding for border agents, surveillance technology, physical barriers, detention capacity and interior enforcement.",
        "Asylum and humanitarian process: the standards and timelines for people who ask for protection at or inside the border, including who may work while a case is pending.",
        "Legal immigration: annual caps, family-based and employment-based categories, per-country limits, and visa programs for specific sectors.",
        "Status for people already here: whether people living in the country without permanent legal status can obtain temporary protection, work authorization or a path to permanent residence.",
      ],
    },
    {
      heading: "Why asylum is the hardest piece",
      paragraphs: [
        "Asylum is a legal status, not a category of person. Under United States law, someone physically present in the country may apply for protection if they fear persecution on specific grounds — including race, religion, nationality, political opinion and membership in a particular social group.",
        "Applying is lawful. The dispute is about how the system handles the volume of applications: how quickly cases are decided, how many judges hear them, what happens to applicants while they wait, and how the standard for an initial screening is defined.",
        "That is why numbers alone rarely settle the argument. Two people can agree on every statistic and still disagree about whether the process is too slow, too generous or too restrictive.",
      ],
    },
    {
      heading: "The vocabulary that gets used loosely",
      paragraphs: [
        "Immigration coverage is full of terms used imprecisely, and the imprecision usually favors whoever is speaking.",
        "Being in the country without authorization is generally a civil violation, not a criminal one, though illegal entry is a federal misdemeanor. Deportation is formally called removal, and it is an administrative process handled through immigration courts inside the Department of Justice, not the regular federal court system.",
        "Terms like amnesty, path to citizenship and legalization are frequently used interchangeably in political speech even though they describe different mechanisms with different requirements and timelines.",
      ],
    },
    {
      heading: "Why comprehensive bills stall",
      paragraphs: [
        "The structural reason is that the four components are used as bargaining chips against each other. Legislators who want expanded enforcement and legislators who want expanded legal status have historically tried to trade one for the other in a single package.",
        "Packages that large give every member a reason to vote no, and they must clear the Senate's 60-vote threshold. Narrow bills — a specific visa category, a specific enforcement appropriation — pass more often precisely because they contain less to object to.",
        "This is also why executive action plays such a large role. When Congress does not legislate, presidents of both parties have used administrative authority, which is faster but can be reversed by the next administration or challenged in court.",
      ],
    },
  ],
  democraticView: {
    label: "Many Democratic lawmakers",
    summary:
      "A common position among Democratic officials is that enforcement funding should be paired with expanded legal pathways and faster, better-staffed asylum processing.",
    points: [
      "Frequently support a path to permanent status for people brought to the country as children and for long-resident workers.",
      "Often prioritize hiring more immigration judges and asylum officers to reduce case backlogs.",
      "Generally resist enforcement-only packages, arguing they do not address the reasons people arrive.",
    ],
  },
  republicanView: {
    label: "Many Republican lawmakers",
    summary:
      "A common position among Republican officials is that enforcement capacity and tighter asylum standards should come first, before or instead of expanded legal status.",
    points: [
      "Frequently prioritize border security funding, detention capacity and faster removal of denied claims.",
      "Many favor raising the standard for initial asylum screening, arguing the current threshold draws claims unlikely to succeed.",
      "Some — particularly members focused on agriculture and construction labor — support expanded temporary work visas.",
    ],
  },
  otherViews: [
    {
      label: "Business and agricultural groups",
      summary:
        "Employer organizations often break from the party they usually align with on this issue.",
      points: [
        "Argue that sectors including agriculture, construction, hospitality and elder care depend on immigrant labor and face persistent shortages.",
        "Frequently push for expanded temporary and permanent work visas regardless of the enforcement debate.",
      ],
    },
    {
      label: "Border-region local officials",
      summary:
        "Mayors and county officials in both parties have focused on operational costs rather than national framing.",
      points: [
        "Emphasize reimbursement for local shelter, medical and transportation costs.",
        "Often request predictability from federal agencies more than any specific policy direction.",
      ],
    },
    {
      label: "Immigrant advocacy and legal aid organizations",
      summary:
        "Legal service providers focus on procedure and representation.",
      points: [
        "Note that immigration court has no guaranteed right to appointed counsel, and that representation strongly correlates with case outcomes.",
        "Argue that detention conditions and case backlogs are administrative problems that legislation rarely addresses directly.",
      ],
    },
  ],
  knownFacts: [
    "Immigration law is set at the federal level by Congress and administered by executive agencies.",
    "Applying for asylum from within the United States is lawful under federal law.",
    "Immigration courts operate within the Department of Justice, not the independent federal judiciary.",
    "There is no government-provided attorney in immigration proceedings.",
    "Unlawful presence is generally a civil violation; unlawful entry is a federal misdemeanor.",
  ],
  uncertainties: [
    "How much any specific enforcement measure changes migration patterns is disputed among researchers.",
    "Estimates of the long-run fiscal effect of immigration differ depending on time horizon and level of government analyzed.",
    "Whether administrative policy changes will survive court challenges is frequently unresolved for months or years.",
  ],
  keyTerms: [
    {
      term: "Asylum",
      definition:
        "Protection granted to someone already in the country who shows a well-founded fear of persecution on specific legal grounds.",
    },
    {
      term: "Removal",
      definition:
        "The formal legal term for deportation — an administrative process decided in immigration court.",
    },
    {
      term: "Green card",
      definition:
        "Informal name for lawful permanent residence, which allows a person to live and work permanently in the United States.",
    },
    {
      term: "Parole",
      definition:
        "Temporary permission for a person to enter or remain in the country for urgent humanitarian reasons or significant public benefit.",
    },
    {
      term: "Comprehensive immigration reform",
      definition:
        "A package combining enforcement, legal immigration and status changes in one bill, rather than passing them separately.",
    },
  ],
  sources: [
    {
      id: "src-uscis",
      publisher: "U.S. Citizenship and Immigration Services",
      title: "Policy manual and application statistics",
      date: "Updated periodically",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
    {
      id: "src-eoir",
      publisher: "Executive Office for Immigration Review",
      title: "Immigration court caseload statistics",
      date: "Quarterly",
      url: "#",
      kind: "data",
      isPlaceholder: true,
    },
    {
      id: "src-crs-immigration",
      publisher: "Congressional Research Service",
      title: "Immigration legislation overview (report series)",
      date: "Updated periodically",
      url: "#",
      kind: "analysis",
      isPlaceholder: true,
    },
  ],
  authorId: "dev-anand",
  type: "explainer",
  status: "published",
  publishedAt: "2026-08-26T13:00:00.000Z",
  updatedAt: "2026-08-26T13:00:00.000Z",
  readTime: 7,
  cover: { pattern: "wave", hue: 170 },
  featured: false,
  significance: 86,
  isDemo: true,
};

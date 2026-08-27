import type { Article } from "@/types/ngn";

export const foreignAidAndWarPowers: Article = {
  id: "art-foreign-powers",
  slug: "who-decides-american-foreign-policy",
  headline:
    "Who Actually Decides When America Sends Money — or Force — Abroad",
  subheadline:
    "The Constitution splits foreign policy between the president and Congress without saying exactly where the line is. Two centuries later, that argument is still live.",
  summary:
    "Presidents direct diplomacy and command the military; Congress declares war, controls funding and ratifies treaties. The overlap between those powers is where most foreign policy disputes actually happen.",
  inTwentySeconds:
    "The Constitution gives the president command of the military and Congress the power to declare war and to control the money. Since 1942 Congress has not issued a formal declaration of war, and presidents of both parties have used force under other authorities. So the real question in any foreign policy fight is usually not 'should we act' but 'who has to approve it, and who pays.'",
  category: "foreign-policy",
  issueSlugs: ["foreign-policy"],
  quickWhatHappened:
    "Decisions about military action and foreign assistance continue to move through a shared and contested constitutional structure, with Congress asserting authority mainly through funding.",
  quickWhyItMatters:
    "These decisions commit American money and, sometimes, American service members. Understanding which branch decides tells you who to hold accountable.",
  quickWhatNext:
    "Watch appropriations text for foreign assistance line items, and watch for war powers resolutions — the mechanism Congress uses to try to force a vote on ongoing military operations.",
  body: [
    {
      heading: "The split, as written",
      paragraphs: [
        "Article II makes the president commander in chief of the armed forces and gives the executive branch the lead on diplomacy. Article I gives Congress the power to declare war, to raise and support armies, and to appropriate all federal spending. Treaties require ratification by two-thirds of the Senate.",
        "The Constitution does not explain what happens when the president uses force without a declaration. That silence is the source of the recurring dispute.",
        "Congress passed the War Powers Resolution in 1973 to address it. It requires the president to notify Congress after introducing forces into hostilities and to withdraw them within a set period absent congressional authorization. Presidents of both parties have questioned its constitutionality while generally reporting under it anyway.",
      ],
    },
    {
      heading: "Why the money matters more than the mandate",
      paragraphs: [
        "In practice, Congress's most reliable foreign policy power is the appropriation. Military operations and foreign assistance both require funding, and funding requires a vote.",
        "That is why foreign policy debates so often surface inside spending bills rather than as standalone authorizations — and why they collide with the same deadlines that drive domestic funding fights.",
        "Foreign assistance itself is frequently misunderstood. It includes military assistance, development and health programs, and humanitarian relief, and a substantial share is spent on goods and services from American suppliers. It is also a much smaller share of the federal budget than public surveys typically estimate.",
      ],
    },
    {
      heading: "Alliances are commitments, not favors",
      paragraphs: [
        "Treaty alliances create standing obligations. NATO, for example, is a mutual defense alliance founded in 1949 whose Article 5 provides that an armed attack against one member is considered an attack against all — though each member decides what action it takes in response.",
        "Debates about alliances usually concern burden-sharing — how much each member spends on defense — rather than whether the commitment exists.",
        "Understanding that distinction clarifies a lot of coverage: an argument that allies should spend more is different from an argument that the United States should leave.",
      ],
    },
  ],
  democraticView: {
    label: "Many Democratic officials",
    summary:
      "A common position among Democratic lawmakers emphasizes alliances, multilateral institutions and development assistance alongside military tools.",
    points: [
      "Generally support sustained funding for development and global health programs as instruments of policy.",
      "Frequently emphasize alliance commitments and coordination through international institutions.",
      "A faction within the party consistently opposes military deployments and arms transfers, sometimes joining Republicans on war powers votes.",
    ],
  },
  republicanView: {
    label: "Many Republican officials",
    summary:
      "A common position among Republican lawmakers emphasizes military strength and burden-sharing, with significant internal disagreement about intervention.",
    points: [
      "Frequently prioritize defense spending and argue allies should contribute more.",
      "Many are skeptical of non-military foreign assistance and press for stricter conditions on it.",
      "A significant faction favors substantially reduced overseas commitments, putting it at odds with the party's traditional internationalists.",
    ],
  },
  otherViews: [
    {
      label: "Congressional war powers advocates",
      summary:
        "A cross-party group of members has pushed to reclaim authorization power from the executive branch.",
      points: [
        "Argue that decades-old authorizations for the use of military force have been stretched to cover operations Congress never voted on.",
        "Have introduced repeal-and-replace proposals with sponsors from both parties.",
      ],
    },
    {
      label: "Humanitarian organizations",
      summary:
        "Aid groups focus on the delivery mechanism rather than the strategic debate.",
      points: [
        "Argue that unpredictable funding cycles disrupt long-running health and food programs.",
        "Note that assistance routed through military channels operates under different rules than civilian aid.",
      ],
    },
  ],
  knownFacts: [
    "The Constitution gives Congress the power to declare war and the president the role of commander in chief.",
    "Congress last issued a formal declaration of war in 1942.",
    "The War Powers Resolution was enacted in 1973 over a presidential veto.",
    "Treaties require ratification by two-thirds of the Senate.",
    "NATO was founded in 1949, and its Article 5 treats an armed attack on one member as an attack on all.",
    "All federal spending, including foreign assistance, requires an appropriation from Congress.",
  ],
  uncertainties: [
    "The constitutional limits of presidential authority to use force without congressional authorization remain unsettled and are rarely resolved by courts.",
    "Assessments of foreign assistance effectiveness vary widely by program type and evaluation method.",
    "Whether Congress will replace older authorizations for the use of military force has been debated for years without resolution.",
  ],
  keyTerms: [
    {
      term: "War Powers Resolution",
      definition:
        "A 1973 law requiring the president to notify Congress when introducing forces into hostilities and to withdraw them absent authorization.",
    },
    {
      term: "AUMF",
      definition:
        "Authorization for Use of Military Force — a congressional resolution authorizing military action short of a formal declaration of war.",
    },
    {
      term: "Foreign assistance",
      definition:
        "Federal spending abroad, including military aid, development and health programs, and humanitarian relief.",
    },
    {
      term: "Article 5",
      definition:
        "The NATO treaty provision stating that an armed attack against one member is considered an attack against all.",
    },
  ],
  sources: [
    {
      id: "src-constitution",
      publisher: "U.S. Constitution",
      title: "Article I, Section 8 and Article II, Section 2",
      date: "Founding document",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
    {
      id: "src-crs-warpowers",
      publisher: "Congressional Research Service",
      title: "War Powers Resolution: Presidential Compliance (report series)",
      date: "Updated periodically",
      url: "#",
      kind: "analysis",
      isPlaceholder: true,
    },
    {
      id: "src-state-budget",
      publisher: "U.S. Department of State",
      title: "Congressional Budget Justification for Foreign Operations",
      date: "Annual",
      url: "#",
      kind: "data",
      isPlaceholder: true,
    },
  ],
  authorId: "dev-anand",
  type: "explainer",
  status: "published",
  publishedAt: "2026-08-24T14:00:00.000Z",
  updatedAt: "2026-08-24T14:00:00.000Z",
  readTime: 6,
  cover: { pattern: "orbit", hue: 25 },
  featured: false,
  significance: 72,
  isDemo: true,
};

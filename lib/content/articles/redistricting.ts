import type { Article } from "@/types/ngn";

export const redistricting: Article = {
  id: "art-redistricting",
  slug: "redistricting-explained",
  headline:
    "Redistricting: How Lines on a Map Decide Elections Before Anyone Votes",
  subheadline:
    "Every ten years the boundaries of legislative districts get redrawn. Who draws them, and by what rules, is one of the most consequential and least covered fights in American politics.",
  summary:
    "District boundaries determine which votes translate into which seats. The redrawing process is controlled by different bodies in different states, and the resulting maps are routinely challenged in court.",
  inTwentySeconds:
    "House seats and state legislative seats are won district by district, so the shape of a district can decide the outcome before a single vote is cast. Districts are redrawn after each census, usually by state legislatures — meaning whichever party controls a statehouse often draws the map it will run on. That is legal in many circumstances, illegal in others, and the line between them is set by courts.",
  category: "elections",
  issueSlugs: ["voting-elections"],
  quickWhatHappened:
    "Congressional and legislative maps drawn after the decennial census continue to move through legislatures, commissions and courts, with litigation frequently changing maps between elections.",
  quickWhyItMatters:
    "Map design influences how competitive elections are, which communities have representation, and how closely a legislature's partisan balance matches the statewide vote.",
  quickWhatNext:
    "Watch for court rulings ordering new maps, and for state ballot measures that would move map-drawing from legislatures to independent commissions.",
  body: [
    {
      heading: "Why districts exist at all",
      paragraphs: [
        "The House of Representatives has 435 seats, apportioned among the states by population using the census conducted every ten years. States that gain population can gain seats; states that lose population can lose them.",
        "Each seat represents a geographic district, and each state must draw those district boundaries itself. The same is true for state legislative seats.",
        "Because a district is won by whoever gets the most votes inside it, how the boundaries are drawn determines how votes convert into seats. Two maps of the same state, with identical voters, can produce very different results.",
      ],
    },
    {
      heading: "Who draws the map",
      paragraphs: [
        "This varies dramatically by state, and it is the single most useful thing to know about any redistricting story.",
      ],
      bullets: [
        "In most states, the state legislature draws congressional maps, usually subject to a governor's veto.",
        "Some states use independent or bipartisan commissions specifically designed to remove the legislature from the process.",
        "Some use advisory or backup commissions that act only if the legislature deadlocks.",
        "Courts step in when a map is challenged — and court-ordered maps have redrawn districts in the middle of election cycles.",
      ],
    },
    {
      heading: "Gerrymandering, precisely",
      paragraphs: [
        "Gerrymandering means drawing boundaries to advantage a particular group. The two classic techniques are cracking — splitting a bloc of like-minded voters across several districts so they are a majority in none — and packing — concentrating them into as few districts as possible so their influence is contained.",
        "The legal treatment differs sharply by type. Racial gerrymandering — drawing lines to dilute the voting power of a racial group — can violate the Voting Rights Act and the Constitution, and courts hear those cases regularly.",
        "Partisan gerrymandering is treated differently. The Supreme Court has held that claims of excessive partisan gerrymandering present political questions that federal courts cannot resolve, leaving them to state courts, state constitutions and legislatures.",
        "That distinction explains why some maps are struck down and others, which look similar on a map, are not.",
      ],
    },
    {
      heading: "What a fair map even means",
      paragraphs: [
        "There is no single agreed definition, and this is a real analytical dispute rather than a partisan talking point.",
        "Some standards emphasize proportionality — a party winning 55 percent of the statewide vote should win roughly 55 percent of seats. Others emphasize traditional criteria: compact shapes, respect for county and city boundaries, and keeping communities of interest together.",
        "These goals conflict. Voters are not evenly distributed geographically, so a map built strictly on compactness can produce a seat split that does not track the statewide vote, and a map built for proportionality can require oddly shaped districts.",
        "When you read that a map is fair or unfair, the useful question is: by which of those standards?",
      ],
    },
  ],
  democraticView: {
    label: "Many Democratic officials",
    summary:
      "A common position among Democratic lawmakers supports independent commissions and federal standards for map-drawing.",
    points: [
      "Frequently support national legislation setting redistricting criteria and requiring independent commissions.",
      "Often emphasize Voting Rights Act enforcement in challenges to maps.",
      "In states where they control the legislature, Democratic majorities have also drawn maps favoring their own candidates — a tension critics point out.",
    ],
  },
  republicanView: {
    label: "Many Republican officials",
    summary:
      "A common position among Republican lawmakers is that the Constitution assigns redistricting to state legislatures and that federal mandates would intrude on state authority.",
    points: [
      "Argue that elected legislatures are more accountable than appointed commissions.",
      "Frequently oppose federal redistricting standards as an overreach into state election administration.",
      "In states where they control the legislature, Republican majorities have likewise drawn maps favoring their own candidates.",
    ],
  },
  otherViews: [
    {
      label: "Independent commission advocates",
      summary:
        "Reform organizations, some bipartisan, focus on removing self-interest from the process regardless of which party benefits.",
      points: [
        "Argue that legislators drawing their own districts is a structural conflict of interest.",
        "Point to states where commission maps produced more competitive districts, while acknowledging results vary by design.",
      ],
    },
    {
      label: "Voting rights organizations",
      summary:
        "Civil rights groups focus on representation for communities that have historically been split apart by map lines.",
      points: [
        "Emphasize that minority representation cases turn on specific evidentiary standards, not general fairness claims.",
        "Note that litigation timelines often mean an election is held under a map later found unlawful.",
      ],
    },
    {
      label: "Political scientists",
      summary:
        "Researchers caution against attributing all polarization to map-drawing.",
      points: [
        "Find that geographic sorting — like-minded people living near each other — accounts for a substantial share of uncompetitive districts.",
        "Disagree about how much redistricting changes national seat totals relative to candidate quality and national conditions.",
      ],
    },
  ],
  knownFacts: [
    "The House of Representatives has 435 seats, apportioned among states by population after each decennial census.",
    "States draw their own congressional and legislative district boundaries.",
    "Cracking and packing are the two standard techniques for drawing districts to advantage a group.",
    "Racial gerrymandering claims can be brought under the Voting Rights Act and the Constitution.",
    "The Supreme Court has held that partisan gerrymandering claims are not resolvable in federal court.",
    "Some states use independent or bipartisan commissions rather than legislatures to draw maps.",
  ],
  uncertainties: [
    "How much redistricting affects national House control relative to other factors is actively debated by researchers.",
    "Whether pending litigation will change specific maps before an election is often unknown until shortly before filing deadlines.",
    "The long-run effects of commission-drawn maps on competitiveness vary by state and are still being studied.",
  ],
  keyTerms: [
    {
      term: "Apportionment",
      definition:
        "Dividing the 435 House seats among the states based on census population. Distinct from redistricting, which draws the lines within a state.",
    },
    {
      term: "Cracking",
      definition:
        "Splitting a group of similar voters across multiple districts so they cannot form a majority in any of them.",
    },
    {
      term: "Packing",
      definition:
        "Concentrating a group of similar voters into as few districts as possible to limit their influence elsewhere.",
    },
    {
      term: "Community of interest",
      definition:
        "A population sharing common concerns that map-drawers are often asked to keep within a single district.",
    },
    {
      term: "Voting Rights Act",
      definition:
        "A federal law prohibiting voting practices that discriminate on the basis of race, used in challenges to district maps.",
    },
  ],
  sources: [
    {
      id: "src-census-apportionment",
      publisher: "U.S. Census Bureau",
      title: "Apportionment results and redistricting data files",
      date: "Decennial",
      url: "#",
      kind: "data",
      isPlaceholder: true,
    },
    {
      id: "src-ncsl-redistricting",
      publisher: "National Conference of State Legislatures",
      title: "Redistricting systems by state",
      date: "Updated periodically",
      url: "#",
      kind: "analysis",
      isPlaceholder: true,
    },
    {
      id: "src-doj-vra",
      publisher: "U.S. Department of Justice",
      title: "Voting Rights Act enforcement guidance",
      date: "Reference",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
  ],
  authorId: "iris-chen",
  type: "explainer",
  status: "published",
  publishedAt: "2026-08-25T15:10:00.000Z",
  updatedAt: "2026-08-25T15:10:00.000Z",
  readTime: 7,
  cover: { pattern: "grid", hue: 210 },
  featured: false,
  significance: 79,
  isDemo: true,
};

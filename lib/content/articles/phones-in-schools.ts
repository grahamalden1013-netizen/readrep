import type { Article } from "@/types/ngn";

export const phonesInSchools: Article = {
  id: "art-phones-schools",
  slug: "phones-in-schools-policy-explained",
  headline:
    "States Are Rewriting the Rules for Phones in School — and Students Are Rarely in the Room",
  subheadline:
    "Restrictions are being written at three different levels of government at once. Which level decides your school day depends on where you live.",
  summary:
    "Legislatures, state boards of education and individual districts have all moved to restrict phone use during the school day. The policies differ sharply in how strict they are and who enforces them.",
  inTwentySeconds:
    "Phone rules in schools are set by a layered system: state legislatures can pass laws, state boards can issue guidance, and local school boards write the actual policy your school follows. Because of that layering, two schools an hour apart can have completely different rules — and the strongest version, a bell-to-bell ban, is very different from a classroom-only restriction.",
  category: "education",
  issueSlugs: ["education", "technology"],
  quickWhatHappened:
    "A wave of state-level policy has shifted phone rules from a school-by-school choice toward statewide requirements, with wide variation in how far the restrictions go.",
  quickWhyItMatters:
    "This is one of the few active policy debates where the people most directly affected are students — and where student input is often collected after the decision rather than before.",
  quickWhatNext:
    "Watch for enforcement details and exceptions: how devices are stored, what happens for students with medical needs or disabilities, and whether districts get funding for storage systems.",
  body: [
    {
      heading: "Who actually decides",
      paragraphs: [
        "Education in the United States is primarily governed at the state and local level. There is no national school phone policy, and the federal Department of Education does not set classroom conduct rules.",
        "That leaves three layers. A state legislature can pass a law requiring or authorizing restrictions. A state board of education or department can issue rules and model policies. A local school board — usually elected — adopts the policy your school enforces, and administrators write the specific procedures.",
        "When a news story says 'the state banned phones,' the operative question is which of those layers acted, and whether it mandated a policy or merely encouraged one.",
      ],
    },
    {
      heading: "The policies are not the same policy",
      paragraphs: [
        "Coverage tends to flatten a range of quite different rules into one word: ban. In practice, the versions differ substantially.",
      ],
      bullets: [
        "Bell-to-bell restrictions cover the entire school day, including lunch and passing periods.",
        "Instructional-time restrictions apply only during class, leaving breaks unrestricted.",
        "Storage-based approaches require phones in lockable pouches or classroom cubbies; possession-based approaches only require phones to be off and away.",
        "Nearly all versions include exceptions — commonly for documented medical needs, for students with disabilities whose plans require a device, and for emergencies.",
      ],
    },
    {
      heading: "What the research does and does not say",
      paragraphs: [
        "Supporters and critics both cite studies, and the honest summary is that the evidence base is still developing.",
        "There is reasonably consistent research linking phone presence to distraction and reduced task performance. There is much less agreement about whether school-day restrictions improve measured academic outcomes over a full year, partly because schools that adopt restrictions often change several things at once.",
        "Research on adolescent mental health and social media is genuinely contested among researchers, with credible work pointing in different directions on the size and direction of the effect.",
        "A responsible reading: the case for reducing in-class distraction is stronger than the case that any specific policy design produces a specific outcome.",
      ],
    },
    {
      heading: "The arguments students make most",
      paragraphs: [
        "Student objections tend to cluster around three concerns: emergency contact with family, coordination of after-school logistics like rides and work shifts, and the sense that a full-day ban treats a class of people as untrustworthy rather than addressing a specific behavior.",
        "Supporters of restrictions respond that emergency communication is precisely the situation where phones cause problems — school safety officials generally advise contacting the school office rather than individual students during an incident.",
        "Both concerns are real. Policy design, not slogans, is where they get reconciled.",
      ],
    },
  ],
  democraticView: {
    label: "Many Democratic officials",
    summary:
      "Support for school phone restrictions is unusually bipartisan, and many Democratic officials frame it as a student wellbeing and mental health measure.",
    points: [
      "Frequently pair restriction proposals with funding for school counselors and mental health services.",
      "Often emphasize equity in implementation — for example, funding storage systems so the burden does not fall on families.",
      "Some caution against punitive enforcement that could lead to disproportionate discipline.",
    ],
  },
  republicanView: {
    label: "Many Republican officials",
    summary:
      "Many Republican officials support restrictions as a matter of classroom order and instructional time, often while emphasizing local control.",
    points: [
      "Frequently frame the issue around academic focus and teacher authority in the classroom.",
      "Some prefer state guidance over state mandates, arguing districts and parents should make the final call.",
      "Others support statewide mandates specifically to create consistent expectations across districts.",
    ],
  },
  otherViews: [
    {
      label: "Teachers and school administrators",
      summary:
        "Educator groups tend to focus on enforceability rather than the principle.",
      points: [
        "Argue that policies without a storage system push enforcement onto individual teachers, creating daily conflict.",
        "Note that inconsistent enforcement across classrooms undermines the policy faster than any objection to it.",
      ],
    },
    {
      label: "Students and student organizations",
      summary:
        "Student government associations and youth advocacy groups have pressed to be consulted during policy design.",
      points: [
        "Commonly ask for phased implementation and clearly written exception processes.",
        "Some student groups support restrictions outright, particularly where policies were designed with student input.",
      ],
    },
    {
      label: "Disability and civil liberties advocates",
      summary:
        "Advocates focus on the exception categories and on search-and-seizure questions.",
      points: [
        "Emphasize that students with medical devices or accommodation plans need guaranteed access, not case-by-case permission.",
        "Raise questions about whether and when school staff may search a confiscated device.",
      ],
    },
  ],
  knownFacts: [
    "Education policy in the United States is primarily a state and local responsibility.",
    "No federal law sets school phone policy.",
    "State approaches range from full-day restrictions to guidance that leaves the decision to districts.",
    "Nearly all adopted policies include exceptions for documented medical needs and disability accommodations.",
    "Local school boards, which are typically elected, adopt the policies that schools enforce.",
  ],
  uncertainties: [
    "Whether school-day restrictions produce measurable long-run academic gains is not yet well established.",
    "Research on social media and adolescent mental health remains actively contested among researchers.",
    "Enforcement consistency — the biggest predictor of whether a policy works in practice — is difficult to measure across districts.",
  ],
  keyTerms: [
    {
      term: "Bell-to-bell",
      definition:
        "A restriction covering the entire school day, including lunch and passing periods, not just class time.",
    },
    {
      term: "Local control",
      definition:
        "The principle that school decisions should be made by districts and elected school boards rather than by state or federal government.",
    },
    {
      term: "IEP / 504 plan",
      definition:
        "Legal documents setting out accommodations for students with disabilities. They can require access to specific devices.",
    },
    {
      term: "Model policy",
      definition:
        "Template language a state agency publishes for districts to adopt voluntarily. It is guidance, not a mandate.",
    },
  ],
  sources: [
    {
      id: "src-nces",
      publisher: "National Center for Education Statistics",
      title: "School survey data on cellphone policies",
      date: "Periodic",
      url: "#",
      kind: "data",
      isPlaceholder: true,
    },
    {
      id: "src-state-code",
      publisher: "State legislature",
      title: "Enacted bill text on wireless device use in schools",
      date: "By session",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
    {
      id: "src-district-policy",
      publisher: "Local school district",
      title: "Board-adopted student conduct policy",
      date: "By district",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
  ],
  authorId: "ngn-desk",
  type: "news",
  status: "published",
  publishedAt: "2026-08-26T16:20:00.000Z",
  updatedAt: "2026-08-26T16:20:00.000Z",
  readTime: 6,
  cover: { pattern: "grid", hue: 230 },
  featured: false,
  significance: 84,
  isDemo: true,
};

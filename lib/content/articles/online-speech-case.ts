import type { Article } from "@/types/ngn";

export const onlineSpeechCase: Article = {
  id: "art-online-speech",
  slug: "supreme-court-online-speech-explained",
  headline:
    "When the Supreme Court Takes Up Online Speech, What Is Actually Being Decided",
  subheadline:
    "Cases about social media are usually framed as fights over censorship. The legal question is narrower — and understanding it changes how you read the coverage.",
  summary:
    "Disputes over what platforms must carry, what they may remove, and what government may pressure them to do turn on the First Amendment and a 1996 statute. The Court rules on those questions, not on whether moderation is fair.",
  inTwentySeconds:
    "The First Amendment limits what the government can do about speech — it does not directly govern private companies. So when a social media case reaches the Supreme Court, the fight is usually about one of three things: whether a platform's moderation choices are themselves protected speech, whether a state can require platforms to carry content they would rather remove, or whether government officials crossed the line from persuading a company into coercing it.",
  category: "courts",
  issueSlugs: ["technology", "voting-elections"],
  quickWhatHappened:
    "State laws, federal statutes and lawsuits over online moderation keep converging on the Supreme Court, which has been asked to define how a constitutional rule written for printing presses applies to recommendation algorithms.",
  quickWhyItMatters:
    "The outcome shapes what you see in a feed, who decides what stays up, and how much power state governments have over national platforms — including the platforms most teenagers use daily.",
  quickWhatNext:
    "Watch whether the Court decides a case broadly or narrowly. Many of these disputes are resolved on procedural grounds, which leaves the underlying question open for a future case.",
  body: [
    {
      heading: "The rule most people get backwards",
      paragraphs: [
        "The First Amendment says Congress shall make no law abridging the freedom of speech. Courts have long read that as a restriction on government, and through the Fourteenth Amendment it applies to state and local governments too.",
        "It is not a rule about private companies. A platform removing a post is not, by itself, a First Amendment violation, because the platform is not the government. That is why 'this violates my free speech' is often a moral claim rather than a legal one.",
        "The interesting cases are the ones that complicate that clean line.",
      ],
    },
    {
      heading: "Three questions that keep recurring",
      paragraphs: [
        "Almost every major online-speech dispute is a version of one of these:",
      ],
      bullets: [
        "Is moderation itself protected speech? If deciding what to display is an editorial judgment, then forcing a platform to carry content may be compelled speech — which the government generally cannot do.",
        "Can a state regulate a national platform? States have passed laws restricting how platforms moderate political content. Platforms argue these laws violate their editorial rights; states argue they are protecting citizens from private censorship.",
        "When does government pressure become coercion? Officials may criticize companies. But if they threaten regulatory consequences to force removals, courts have treated that as government action — a doctrine often called jawboning.",
      ],
    },
    {
      heading: "Where Section 230 fits",
      paragraphs: [
        "Section 230 of the Communications Decency Act, passed in 1996, is separate from the Constitution. It generally provides that an online service is not treated as the publisher of content posted by its users, and that it may moderate content in good faith without becoming liable for what it leaves up.",
        "That statute is why platforms are not routinely sued over user posts. It is also the single most commonly proposed target for reform — from both parties, for opposite reasons.",
        "A crucial distinction: Congress can change Section 230 with a normal law. Changing the First Amendment analysis requires the courts.",
      ],
    },
    {
      heading: "How to read the ruling when it comes",
      paragraphs: [
        "Supreme Court decisions are frequently narrower than the headlines suggest. A case can be sent back to a lower court, decided on standing — meaning the Court found the plaintiffs were not the right parties to bring it — or resolved on a technical point that leaves the big question untouched.",
        "When a decision lands, look for three things: what exactly the Court held, how many justices signed the controlling opinion, and whether concurrences suggest a majority would rule differently in a slightly different case.",
        "The last one matters most for predicting what comes next.",
      ],
    },
  ],
  democraticView: {
    label: "Many Democratic officials",
    summary:
      "A common position among Democratic lawmakers focuses on the harms of content that spreads at scale, particularly for minors, and on holding platforms accountable for design choices.",
    points: [
      "Frequently argue that platforms should face more responsibility for algorithmic amplification, as distinct from merely hosting content.",
      "Often support requirements aimed at protecting minors, such as default privacy settings and limits on engagement-maximizing design.",
      "Generally oppose state laws that would restrict platforms from removing content they consider harmful.",
    ],
  },
  republicanView: {
    label: "Many Republican officials",
    summary:
      "A common position among Republican lawmakers is that large platforms have removed or suppressed lawful political speech unevenly, and that this warrants legal limits on moderation.",
    points: [
      "Several states led by Republicans have enacted laws restricting platforms' ability to remove content based on viewpoint.",
      "Many argue Section 230's liability shield should be conditioned on viewpoint-neutral moderation.",
      "Others in the party — particularly those emphasizing private property rights — oppose telling companies what they must publish.",
    ],
  },
  otherViews: [
    {
      label: "Civil liberties organizations",
      summary:
        "Groups focused on speech rights often end up opposing both parties' proposals, on the same principle.",
      points: [
        "Argue that laws forcing platforms to carry speech and laws pressuring platforms to remove speech both hand government control over private expression.",
        "Warn that weakening Section 230 would push platforms toward removing far more lawful content to limit legal risk.",
      ],
    },
    {
      label: "Researchers and child-safety advocates",
      summary:
        "Some specialists argue the legal debate is aimed at the wrong layer of the problem.",
      points: [
        "Contend that design and ranking systems, not individual takedown decisions, drive most measurable harm.",
        "Note that the research base on social media and adolescent mental health is genuinely contested, with credible studies pointing in different directions.",
      ],
    },
  ],
  knownFacts: [
    "The First Amendment restricts government action on speech; it does not directly bind private companies.",
    "Section 230 is a federal statute enacted in 1996, not a constitutional provision.",
    "The Supreme Court has nine justices, and it takes four to agree to hear a case.",
    "Courts have recognized that government coercion of a private party can itself be state action.",
    "State laws regulating platform moderation have been challenged in federal court and have produced conflicting lower-court rulings.",
  ],
  uncertainties: [
    "How far the Court will extend editorial-discretion protections to algorithmic ranking remains unsettled.",
    "Whether Congress will amend Section 230, and in which direction, is unresolved — proposals exist from both parties with opposite goals.",
    "The long-term effects of state platform laws on smaller services are difficult to predict.",
  ],
  keyTerms: [
    {
      term: "First Amendment",
      definition:
        "The constitutional provision protecting speech, press, religion, assembly and petition from government restriction.",
    },
    {
      term: "Section 230",
      definition:
        "A 1996 federal law providing that online services are generally not treated as the publisher of user-posted content and may moderate in good faith.",
    },
    {
      term: "Compelled speech",
      definition:
        "Government forcing a person or organization to carry a message. Courts treat it as a serious First Amendment problem.",
    },
    {
      term: "Jawboning",
      definition:
        "Informal government pressure on a private company. Legal only up to the point it becomes coercion.",
    },
    {
      term: "Standing",
      definition:
        "The requirement that a plaintiff show a concrete injury. Cases are often dismissed on standing without reaching the main question.",
    },
  ],
  sources: [
    {
      id: "src-scotus-opinions",
      publisher: "Supreme Court of the United States",
      title: "Slip opinions and oral argument transcripts",
      date: "By term",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
    {
      id: "src-crs-230",
      publisher: "Congressional Research Service",
      title: "Section 230: An Overview (report series)",
      date: "Updated periodically",
      url: "#",
      kind: "analysis",
      isPlaceholder: true,
    },
    {
      id: "src-usc-230",
      publisher: "U.S. Code",
      title: "47 U.S.C. Section 230",
      date: "Statute",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
  ],
  authorId: "iris-chen",
  type: "news",
  status: "published",
  publishedAt: "2026-08-27T09:40:00.000Z",
  updatedAt: "2026-08-27T09:40:00.000Z",
  readTime: 6,
  cover: { pattern: "orbit", hue: 300 },
  featured: false,
  significance: 92,
  isDemo: true,
};

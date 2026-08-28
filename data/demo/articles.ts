import type { Article } from "@/types/ngn";
import { SOURCES } from "./sources";

/**
 * DEMO CONTENT — see `data/demo/README.md`.
 *
 * Eight seeded pieces: explanatory briefs plus NGN Weekly editorial. Every one
 * is an explainer about a durable question rather than a report of a breaking
 * event, so nothing here can be mistaken for a claim that something happened
 * today. `provenance` is displayed on every article, and NGN Weekly is always
 * labelled as human analysis rather than neutral news.
 */

export const ARTICLES: Article[] = [
  {
    id: "art-voting",
    slug: "who-gets-to-vote",
    kind: "brief",
    category: "Politics",
    headline: "Who gets to vote, and who decides",
    subheadline:
      "The franchise has been redrawn a dozen times. Each redrawing was argued the way the voting-age question is argued now.",
    explainer:
      "Voting rules in the U.S. are set by a mix of constitutional amendments, federal law and state legislatures — which is why the answer to 'who can vote' depends on which election you mean.",
    author: "NGN Newsroom",
    provenance: "AI-assisted, human-reviewed",
    publishedAt: "Updated this week",
    readMinutes: 4,
    featured: true,
    quickBrief: {
      whatHappened:
        "The voting age has been a live question in American politics since long before the 26th Amendment settled it at 18 in 1971, and several cities have since lowered it for local elections.",
      whyItMatters:
        "Who is inside the electorate shapes every other policy question, because it changes whose preferences politicians have a reason to weigh.",
      whatHappensNext:
        "Lowering the federal age would require a constitutional amendment. Local and state changes are the realistic near-term venue, and several are pending.",
    },
    body: [
      "The Constitution as originally ratified said almost nothing about who could vote. It left qualifications to the states, which is why the story of the American franchise is a story of amendments layered on top of state law rather than a single founding decision.",
      "Three amendments did most of the widening. The 15th barred denial of the vote on account of race. The 19th barred denial on account of sex. The 26th, ratified in 1971, barred denial to citizens 18 or older on account of age. Each was argued at the time as a dangerous expansion, and each is now uncontroversial.",
      "The 26th Amendment moved unusually fast — from proposal to ratification in a matter of months. The argument that carried it was about consistency: young men were being drafted at 18 to fight in Vietnam while being told they were too young to vote on the government sending them.",
      "That is worth noticing, because it is the same shape of argument being made now about 16-year-olds who work and pay tax. Whether the analogy holds is exactly what people disagree about. Supporters say the principle is identical. Opponents say a draft is a burden of a different order than a payroll deduction.",
      "The other thing the history shows is that the venue matters. Federal voting age changes need an amendment — two-thirds of Congress and 38 states. State and local rules need much less. That is why the current activity is concentrated in city councils and school boards rather than in Congress.",
    ],
    understandTheSides: [
      {
        label: "Those who want to widen the franchise",
        text: "Argue that the burden should fall on the state to justify excluding someone from a decision that binds them, not on the excluded person to prove they deserve inclusion.",
      },
      {
        label: "Those who want to hold the line",
        text: "Argue that adulthood is a coherent legal category that arrives with a bundle of rights and responsibilities together, and that unbundling voting from the rest of it needs a stronger justification than consistency alone.",
      },
    ],
    whatWeKnow: [
      "The 26th Amendment set the federal voting age at 18 in 1971.",
      "States set qualifications for their own elections within federal constitutional limits.",
      "Several U.S. municipalities allow 16- and 17-year-olds to vote in local or school board elections.",
      "Austria lowered its national voting age to 16 in 2007.",
    ],
    whatIsUncertain: [
      "Whether early voting habits formed at 16 persist over a lifetime is supported by some research but has not been tested at national scale in the U.S.",
      "How much of the turnout difference in jurisdictions that lowered the age reflects the age change itself rather than the campaigns that accompanied it.",
    ],
    sources: [SOURCES.archivesAmendments, SOURCES.censusVoting, SOURCES.pewResearch, SOURCES.fecData],
    relatedDebateSlug: "voting-age-16",
  },
  {
    id: "art-230",
    slug: "section-230-explained",
    kind: "brief",
    category: "Technology",
    headline: "Twenty-six words that built the internet",
    subheadline:
      "Section 230 is short, old, and the subject of proposals from every direction. Here is what it actually says.",
    explainer:
      "A 1996 provision decides whether a platform can be sued for what its users post. Both parties want to change it, for opposite reasons.",
    author: "NGN Newsroom",
    provenance: "AI-assisted, human-reviewed",
    publishedAt: "Updated this week",
    readMinutes: 4,
    quickBrief: {
      whatHappened:
        "Section 230 of the Communications Decency Act has been the subject of repeated reform proposals from both parties, aimed at opposite problems.",
      whyItMatters:
        "It determines who bears the cost when an online post causes harm — the platform, or only the person who wrote it.",
      whatHappensNext:
        "Proposals range from repeal to narrow carve-outs. Any change would be tested immediately against the First Amendment.",
    },
    body: [
      "The operative language is short: no provider of an interactive computer service shall be treated as the publisher or speaker of information provided by another content provider. In plain terms, a platform is generally not liable for what its users post.",
      "A second part of the same section protects platforms when they remove content in good faith. This is the half that surprises people. Section 230 does not only protect platforms that leave things up; it also protects platforms that take things down.",
      "That is why the statute is criticised from opposite directions. One critique says platforms leave too much harmful material up and should be liable for it. The other says platforms take too much down and should not be protected when they do. Both critiques target the same provision.",
      "It is worth separating what Section 230 does from what the First Amendment does. Even without the statute, a great deal of platform activity would be constitutionally protected. Legal scholars disagree about how much would actually change on repeal — which is a live question, not a settled one.",
      "Congress has already narrowed the protection once, in 2018, with respect to content facilitating sex trafficking. Supporters of reform cite that as proof targeted changes are possible. Opponents cite the same episode as evidence that platforms respond to legal risk by removing lawful speech in adjacent categories.",
    ],
    understandTheSides: [
      {
        label: "Those who want platforms liable",
        text: "Argue that ranking and recommendation are editorial acts, and that a company making editorial decisions at scale should not hold the legal status of a passive conduit.",
      },
      {
        label: "Those who want the protection kept",
        text: "Argue that liability at scale forces pre-emptive deletion, and that the speech removed first belongs to people without legal resources — while only the largest platforms could absorb the litigation.",
      },
    ],
    whatWeKnow: [
      "Section 230 was enacted in 1996 as part of the Communications Decency Act.",
      "It does not shield platforms from federal criminal law or intellectual property claims.",
      "Congress narrowed it in 2018 with respect to sex trafficking content.",
      "The First Amendment independently constrains government regulation of speech.",
    ],
    whatIsUncertain: [
      "How much platform behaviour would actually change on repeal, given independent First Amendment protection.",
      "Whether a liability standard could be drafted that survives constitutional review while producing the intended effect.",
    ],
    sources: [SOURCES.section230Text, SOURCES.supremeCourtOpinions, SOURCES.ftcConsumerProtection, SOURCES.cato],
    relatedDebateSlug: "social-media-liability",
  },
  {
    id: "art-ai",
    slug: "congress-and-ai-rules",
    kind: "brief",
    category: "Technology",
    headline: "Congress, AI, and the rule that does not exist yet",
    subheadline:
      "There is no comprehensive federal AI statute. What fills that space is a patchwork, and it is growing.",
    explainer:
      "Existing law reaches AI where it touches a regulated activity. Development itself is currently governed by voluntary frameworks.",
    author: "NGN Newsroom",
    provenance: "AI-assisted, human-reviewed",
    publishedAt: "Updated this week",
    readMinutes: 3,
    quickBrief: {
      whatHappened:
        "Multiple AI bills have been introduced in Congress without a comprehensive statute being enacted, while several states have passed their own laws.",
      whyItMatters:
        "In the absence of a federal standard, companies face differing state requirements and the public has no verifiable way to check safety claims.",
      whatHappensNext:
        "The main open questions are whether obligations attach to development or deployment, and where any capability threshold is set.",
    },
    body: [
      "Start with what already applies. If an AI system decides who gets a loan, existing lending law applies. If it screens job applicants, employment discrimination law applies. If it is a medical device, device regulation applies. The gap is not that AI is lawless — it is that development itself sits outside any specific regime.",
      "The National Institute of Standards and Technology publishes an AI Risk Management Framework. It is careful, widely referenced, and entirely voluntary. Nothing in it is enforceable.",
      "The proposals in circulation differ on one structural question more than any other: does an obligation attach to building a system, or to deploying it in a particular context? The two produce very different regimes. A development rule needs a capability threshold. A deployment rule needs a definition of context.",
      "There is also a genuine dispute about which harms to centre. Some lawmakers focus on present-day effects — bias in automated decisions, displacement of workers. Others focus on capabilities that do not exist yet but would be hard to reverse. These are different problems and they suggest different instruments.",
      "In the meantime, states have acted. That produces the patchwork that companies and civil liberties groups both cite, for different reasons — one as a compliance burden, the other as evidence that someone is at least legislating.",
    ],
    understandTheSides: [
      {
        label: "Those who want binding federal rules",
        text: "Argue that every other high-consequence technology is tested before deployment, and that voluntary frameworks give the public no way to verify any safety claim.",
      },
      {
        label: "Those who want to wait",
        text: "Argue that rules written now would encode a snapshot of a fast-moving field, and that compliance costs would entrench the largest companies while burdening small and open-source developers.",
      },
    ],
    whatWeKnow: [
      "No comprehensive federal AI development statute is currently in force.",
      "The NIST AI Risk Management Framework is voluntary guidance.",
      "Existing sectoral law applies to AI used in regulated contexts.",
      "Several states have enacted AI-related laws with differing requirements.",
    ],
    whatIsUncertain: [
      "Whether obligations are better attached to model development or to deployment in a context.",
      "Where a capability threshold would be set, and whether any threshold can remain meaningful as the technology changes.",
    ],
    sources: [SOURCES.nistAIFramework, SOURCES.congressLegislation, SOURCES.ftcConsumerProtection, SOURCES.reuters],
    relatedDebateSlug: "ai-regulation",
  },
  {
    id: "art-wage",
    slug: "the-wage-floor",
    kind: "brief",
    category: "Economy",
    headline: "The wage floor that has not moved since 2009",
    subheadline:
      "The federal minimum is $7.25. Because it is not indexed, standing still is itself a decision.",
    explainer:
      "Most states have raised their own minimums past the federal floor, so where the federal number binds is a smaller question than it used to be — and a sharper one.",
    author: "NGN Newsroom",
    provenance: "AI-assisted, human-reviewed",
    publishedAt: "Updated this week",
    readMinutes: 3,
    quickBrief: {
      whatHappened:
        "The federal minimum wage has been $7.25 an hour since July 2009, the longest period without an increase since the minimum was established.",
      whyItMatters:
        "Because the figure is not indexed to inflation, its purchasing power declines every year Congress does not act.",
      whatHappensNext:
        "Proposals differ on the level, the phase-in period, whether to index, and whether to allow regional variation.",
    },
    body: [
      "The federal minimum wage is set by statute and changes only when Congress passes a law. It has been $7.25 an hour since 2009. There is no automatic adjustment, which means the real value of the floor falls in every year Congress does nothing.",
      "Most states now set a higher minimum, and where a state's figure is higher, it governs. So the federal floor binds mainly in states that have not raised their own — which is where the argument about employment effects is most consequential.",
      "The economics is genuinely contested, and it is worth understanding why. The classic prediction is that a price floor above the market rate reduces the quantity demanded. A large body of research studying actual state and city increases has found employment effects close to zero across the ranges studied.",
      "Both of those can be true at once. If employers have wage-setting power — if workers cannot easily move to a competing employer — then a moderate floor can raise wages without reducing employment. How far that holds, and at what level it stops holding, is the live empirical question.",
      "The Congressional Budget Office publishes estimates of proposed increases, and they consistently show both effects: higher earnings for many workers and reduced employment for some. Reading only half of that analysis is the most common failure in this debate, and it happens on both sides.",
    ],
    understandTheSides: [
      {
        label: "Those who want a higher floor",
        text: "Argue that a full-time job should clear a basic standard of living, and that recent evidence shows the predicted job losses were overstated at the levels actually tested.",
      },
      {
        label: "Those who want a lower or local floor",
        text: "Argue that a single national number lands very differently across a country with wide cost-of-living differences, and that costs fall on the least experienced workers.",
      },
    ],
    whatWeKnow: [
      "The federal minimum wage has been $7.25 per hour since July 2009.",
      "The federal minimum is not indexed to inflation.",
      "Where a state minimum exceeds the federal one, the higher rate applies.",
      "The CBO publishes estimates of the earnings and employment effects of proposed increases.",
    ],
    whatIsUncertain: [
      "At what level employment effects become large, which the existing research cannot answer for increases beyond the ranges it has studied.",
      "How much of employer response takes the form of reduced hours or delayed hiring rather than measurable job losses.",
    ],
    sources: [SOURCES.dolMinimumWage, SOURCES.blsData, SOURCES.cboReports, SOURCES.nberPapers],
    relatedDebateSlug: "federal-minimum-wage",
  },
  {
    id: "art-ec",
    slug: "how-a-president-is-chosen",
    kind: "brief",
    category: "Politics",
    headline: "How a president is actually chosen",
    subheadline:
      "Not by a national vote. By 538 electors, allocated by a formula, awarded under rules the Constitution never specified.",
    explainer:
      "Understanding the Electoral College means separating three things: the constitutional structure, state allocation law, and the outcomes they produce together.",
    author: "NGN Newsroom",
    provenance: "AI-assisted, human-reviewed",
    publishedAt: "Updated this week",
    readMinutes: 4,
    quickBrief: {
      whatHappened:
        "Presidential elections are decided by the Electoral College, in which 538 electors are allocated among the states and 270 are needed to win.",
      whyItMatters:
        "The structure can produce a president who did not win the most votes nationally, which has happened five times.",
      whatHappensNext:
        "Abolition requires a constitutional amendment. Changing winner-take-all allocation would not, because it is state law.",
    },
    body: [
      "Each state gets electors equal to its House delegation plus its two senators. The District of Columbia gets three under the 23rd Amendment. That comes to 538, and 270 wins.",
      "Here is the part most people miss. The Constitution does not say a state must give all its electors to whoever wins that state. Winner-take-all is state law, adopted by states over time because it maximised their leverage. Maine and Nebraska already do it differently.",
      "That distinction matters enormously for any reform conversation. Abolishing the College requires an amendment — two-thirds of Congress and 38 states. Changing how a state allocates its electors requires that state's legislature.",
      "The design has also drifted from its original purpose. The framers imagined electors exercising independent judgment. They no longer do: they are party loyalists, and most states legally bind them to their pledge.",
      "So the institution operating today is not really the one described in 1787. Whether that means it should be replaced, or simply that institutions change function over time, is where the argument actually sits.",
    ],
    understandTheSides: [
      {
        label: "Those who want a national popular vote",
        text: "Argue that one person, one vote is the standard applied everywhere else, and that an institution which no longer performs its original function has lost its justification.",
      },
      {
        label: "Those who want to keep the College",
        text: "Argue that the states are the constitutional units that choose a president, and that a national popular vote would nationalise recounts with no national election administrator to run them.",
      },
    ],
    whatWeKnow: [
      "There are 538 electors and 270 are required to win.",
      "Winner-take-all allocation is state law, not constitutional text.",
      "Maine and Nebraska allocate some electors by congressional district.",
      "Five presidents have won while losing the national popular vote.",
    ],
    whatIsUncertain: [
      "Whether the National Popular Vote Interstate Compact would survive legal challenge if it reached the 270-elector threshold.",
      "How campaign behaviour and turnout would change under a national popular vote, since candidates currently optimise for a different objective.",
    ],
    sources: [SOURCES.archivesElectoralCollege, SOURCES.archivesAmendments, SOURCES.fecData, SOURCES.brookings],
    relatedDebateSlug: "electoral-college",
  },
  {
    id: "art-testing",
    slug: "one-number",
    kind: "brief",
    category: "Education",
    headline: "One number, four years, and what admissions can see",
    subheadline:
      "The test debate is not really about tests. It is about which imperfect signal is less unfair than the others.",
    explainer:
      "Both sides of the standardized testing argument cite real data. They disagree about which comparison is the right one to make.",
    author: "NGN Newsroom",
    provenance: "AI-assisted, human-reviewed",
    publishedAt: "Updated this week",
    readMinutes: 3,
    quickBrief: {
      whatHappened:
        "Many institutions adopted test-optional admissions policies; some have since reinstated requirements after analysing their own data.",
      whyItMatters:
        "Admissions criteria determine who gets access to institutions that shape earnings, networks and opportunity for decades.",
      whatHappensNext:
        "Institutions are diverging rather than converging, which means the natural experiment will keep producing evidence.",
    },
    body: [
      "A test score and a transcript are both signals, and both are imperfect in ways that correlate with family income. That is the fact both sides start from, and it is why this argument does not resolve easily.",
      "The case for requiring tests rests on comparability. Grading standards differ enormously across schools, so an A does not mean the same thing everywhere. A common measure is the only element of an application that does.",
      "The case against rests on access. Preparation is a commercial industry that demonstrably raises scores and costs money. A measure with a paid improvement path is not a level comparison, and test-optional institutions frequently reported broader applicant pools.",
      "Notice that these two claims are not actually contradictory. Both can be true: the test is the most comparable signal available, and it is also partly a measure of purchased preparation.",
      "The more interesting disagreement is about what fills the gap. Remove the score and weight shifts to essays, activities and recommendations — components that are, by most analyses, at least as responsive to family resources.",
    ],
    understandTheSides: [
      {
        label: "Those who want tests required",
        text: "Argue that for a student at a school admissions officers do not know, a score is the only portable evidence they have, and removing it removes their one legible signal.",
      },
      {
        label: "Those who want tests optional",
        text: "Argue that requiring a purchasable measure deters qualified applicants before anyone reads their file, and that four years of grades predict college performance at least as well.",
      },
    ],
    whatWeKnow: [
      "Test-optional means the applicant chooses; test-blind means scores are not considered at all.",
      "Some universities reinstated requirements after analysing their own admitted students.",
      "High school grading standards are not standardised across schools or states.",
      "Commercial test preparation varies in cost and availability.",
    ],
    whatIsUncertain: [
      "How much of the reported applicant-pool change under test-optional reflects the policy rather than concurrent outreach efforts.",
      "Whether findings about predictive validity within an admitted population generalise to applicants who were filtered out earlier.",
    ],
    sources: [SOURCES.nces, SOURCES.edGov, SOURCES.urban, SOURCES.brookings],
    relatedDebateSlug: "standardized-testing",
  },

  /* --- NGN Weekly: human-written analysis, clearly labelled -------------- */
  {
    id: "art-weekly-1",
    slug: "the-argument-you-cannot-make",
    kind: "weekly",
    category: "Social Issues",
    headline: "The argument you cannot make is the one you have not understood",
    subheadline:
      "A note on why NGN makes students argue the side they disagree with — and why that is the hardest part of the product.",
    explainer:
      "NGN Weekly is signed analysis, not neutral news. This piece argues a position about how disagreement should be taught.",
    author: "The Editor",
    provenance: "Human-written analysis",
    publishedAt: "This week",
    readMinutes: 5,
    featured: true,
    quickBrief: {
      whatHappened:
        "NGN Arena asks every student, after a debate, to make the strongest possible case for the side they argued against.",
      whyItMatters:
        "It is the feature students resist most, and the one that changes how they argue more than any other.",
      whatHappensNext:
        "Switch Sides scores stay separate from competitive rating, permanently, so nobody can farm the ladder with it.",
    },
    body: [
      "There is a test the philosopher John Stuart Mill proposed and almost nobody passes. He who knows only his own side of the case, Mill wrote, knows little of that. If you cannot state your opponent's position in a form they would recognise and accept, you have not refuted it. You have refuted something easier that you built yourself.",
      "Most political argument online fails this test on purpose. The incentive structure rewards the weakest available version of the other side, because a weak version is satisfying to demolish and satisfying content spreads. Nobody involved is lying. They are just answering a question nobody asked.",
      "So Switch Sides asks students to do the hard thing, at the moment they least want to: immediately after a debate, having just spent twenty minutes building a case, they are asked to make the opposing case at full strength. Not to concede. Not to be balanced. To argue it as well as their opponent did.",
      "What we see, consistently, is that the first attempt is bad. Students write something that sounds like the other side but keeps flinching — a sentence that starts as a steelman and ends with 'but obviously that's wrong'. The scoring catches this, because a case that signals its own rejection is not the case being made.",
      "The second attempt is usually better. By the fifth, something has changed in how the student debates, and it shows up in a category we did not expect it to: rebuttal scores rise. It turns out that if you can build the other side's argument, you can find its actual weak point instead of guessing.",
      "This is why the perspective score is deliberately walled off from Arena Rating, and always will be. The moment representing your opponent fairly earns you ladder points, it becomes a strategy rather than an exercise, and students will optimise it the way they optimise everything else. Some things have to stay unrated to stay honest.",
      "None of this is neutral, and I want to be clear that this piece is not pretending to be. NGN's news coverage is written to be neutral, and we label it as such. This column is an argument. The argument is that understanding your opponent is a skill, that it can be taught, and that a generation which learns it will be harder to manipulate than one that did not.",
    ],
    understandTheSides: [
      {
        label: "The case for making it mandatory",
        text: "Skills that are optional get skipped by exactly the students who need them most, and perspective-taking is uncomfortable enough that few would opt in.",
      },
      {
        label: "The case against",
        text: "Requiring a student to argue a position they find morally objectionable is a real cost, and some questions may not be appropriate to assign either side of.",
      },
    ],
    whatWeKnow: [
      "Switch Sides scores are recorded separately from Arena Rating and cannot affect competitive standing.",
      "Students can decline a Switch Sides exercise without any penalty to their rating.",
      "Assigned-side debates are labelled as assigned, so a student's argued position is never read as their belief.",
    ],
    whatIsUncertain: [
      "Whether the improvement in rebuttal quality we observe is caused by the exercise or by the additional practice it represents.",
    ],
    sources: [SOURCES.pewResearch, SOURCES.brookings],
    relatedDebateSlug: "voting-age-16",
  },
  {
    id: "art-weekly-2",
    slug: "against-the-scoreboard",
    kind: "weekly",
    category: "Education",
    headline: "Against the scoreboard, in defence of the scoreboard",
    subheadline:
      "Competition makes students practise. It also makes them optimise. Building NGN means choosing which of those wins.",
    explainer:
      "NGN Weekly is signed analysis, not neutral news. This piece argues a position about gamification in civic education.",
    author: "The Editor",
    provenance: "Human-written analysis",
    publishedAt: "Last week",
    readMinutes: 4,
    quickBrief: {
      whatHappened:
        "NGN Arena uses ratings, divisions and leaderboards — the same machinery that makes competitive games compelling.",
      whyItMatters:
        "That machinery reliably produces engagement, and just as reliably produces the behaviour it accidentally rewards.",
      whatHappensNext:
        "Every scored surface in NGN is designed against a single question: what would a student do to farm this?",
    },
    body: [
      "There is an obvious objection to putting a rating on political argument, and it is worth stating at full strength before answering it. Scores change what people optimise for. Put a number on debate and students will chase the number, and the fastest route to a number is rarely the route that makes someone a better thinker.",
      "The objection is correct. It is just not a reason to have no scores. Chess has ratings and produces extraordinary players. The relevant question is not whether to measure but what to measure, because whatever you measure is what you will get more of.",
      "So consider what NGN deliberately does not measure. There are no followers. No like counts on debate responses. No public record of which side anyone took. No 'most active debater' board. Every one of those would produce engagement, and every one would reward volume or popularity rather than quality.",
      "What is measured instead: evidence, reasoning, rebuttal, clarity, understanding your opponent, and civility. Understanding your opponent carries the same weight as evidence — a fifth of the score — which means a student who ignores the other side cannot reach the top of the ladder by arguing forcefully.",
      "The design test we apply to every scored surface is a simple one: what would a student do to farm this? If the answer describes something we want more of, the metric is fine. If the answer is 'post constantly' or 'be entertaining' or 'pick the popular side', the metric is wrong and it does not ship.",
      "Civility is only five percent, and people ask about that. It is deliberately small, because a large civility weight punishes sharp disagreement, and sharp disagreement is the point. Five percent is enough to make contempt costly without making politeness the strategy. Argue hard. Just argue with the person's argument.",
    ],
    understandTheSides: [
      {
        label: "The case for competitive structure",
        text: "Rating systems produce sustained deliberate practice, which is what actually builds skill. Without them, students practise once and stop.",
      },
      {
        label: "The case against",
        text: "Any score becomes a target, and optimising for a proxy of good reasoning is not the same as reasoning well.",
      },
    ],
    whatWeKnow: [
      "NGN Arena has no follower counts, no public ideology labels, and no popularity-based ranking.",
      "Understanding Opponent is weighted at 20% of the debate score, equal to Evidence.",
      "Civility is weighted at 5% — enough to make contempt costly, not enough to make politeness a strategy.",
    ],
    whatIsUncertain: [
      "Whether rating-driven practice sustains itself once the novelty of a new system wears off.",
    ],
    sources: [SOURCES.brookings, SOURCES.urban],
    relatedDebateSlug: "standardized-testing",
  },
];

export const ARTICLE_BY_SLUG = new Map(ARTICLES.map((a) => [a.slug, a]));

export function getArticle(slug: string): Article | undefined {
  return ARTICLE_BY_SLUG.get(slug);
}

export const BRIEF_ARTICLES = ARTICLES.filter((a) => a.kind === "brief");
export const WEEKLY_ARTICLES = ARTICLES.filter((a) => a.kind === "weekly");

export function latestWeekly(): Article {
  return WEEKLY_ARTICLES[0];
}

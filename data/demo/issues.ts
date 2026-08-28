import type { Issue } from "@/types/ngn";

/**
 * DEMO CONTENT — see `data/demo/README.md`.
 *
 * The issue library. The rule enforced throughout: never flatten a party into
 * a single belief. Every issue records where each party disagrees with itself,
 * because that internal disagreement is usually where the real argument is.
 */

export const ISSUES: Issue[] = [
  {
    id: "iss-voting",
    slug: "voting-and-elections",
    title: "Voting and Elections",
    category: "Politics",
    summary:
      "Who can vote, how they vote, how those votes become officeholders, and who gets to write those rules.",
    basics: [
      "The Constitution left voting qualifications largely to the states, then narrowed that discretion through amendments barring exclusion by race, sex and age.",
      "Federal elections are administered by states and counties, so the practical experience of voting varies enormously between jurisdictions.",
      "Congress can regulate the time, place and manner of federal elections, which is the constitutional basis for most federal voting legislation.",
    ],
    whyPeopleDebate:
      "Election rules are the rules for changing all other rules. Any change to who votes or how votes are counted is also a change in who is likely to win, which means no participant can be a neutral party to the argument. That is what makes these disputes unusually hard to settle on the merits.",
    democraticViews: [
      "Many Democratic lawmakers prioritise expanding access — automatic and same-day registration, expanded mail voting, and restoring voting rights after felony convictions.",
      "Democratic officials more often support federal standards for election administration, arguing that a federal right should not depend on which county someone lives in.",
      "Many Democrats argue that identification requirements impose costs that fall unevenly, and favour broad forms of acceptable identification where requirements exist.",
    ],
    republicanViews: [
      "Many Republican lawmakers prioritise verification measures, arguing that public confidence in results depends on procedures voters can see are secure.",
      "Republican officials more often argue that election administration is constitutionally the states' responsibility and resist federal standardisation.",
      "Many Republicans support identification requirements, generally arguing that a check applied to other transactions is not unreasonable at the ballot box.",
    ],
    otherPerspectives: [
      "Election administrators, who are frequently nonpartisan career officials, often argue that both parties underweight implementation: funding, staffing and equipment determine more about how an election runs than the statute does.",
      "Some political scientists argue that the largest effects on turnout come from campaign contact and civic habit rather than from the procedural rules both parties fight over.",
    ],
    democraticDisagreement:
      "Democrats differ on how far federal preemption should go. Some argue for comprehensive federal standards; others, including several state officials, argue that local administrators know their jurisdictions and that federal mandates would be unfunded and clumsy.",
    republicanDisagreement:
      "Republicans differ on mail voting in particular. Some state parties have invested heavily in mail ballot programmes, arguing they are a turnout tool like any other; others have campaigned to restrict them.",
    keyTerms: [
      { term: "Voter registration", definition: "The process of adding an eligible person to the list of voters for a jurisdiction." },
      { term: "Preemption", definition: "When federal law overrides conflicting state law in the same area." },
      { term: "Provisional ballot", definition: "A ballot cast when eligibility is in question, counted only once eligibility is confirmed." },
      { term: "Redistricting", definition: "Redrawing legislative district boundaries, usually after each census." },
    ],
    keyFacts: [
      "Elections are administered by states and localities, not by a federal agency.",
      "The 15th, 19th and 26th Amendments each removed a specific basis for denying the vote.",
      "The Census Bureau publishes voting and registration data after each federal election.",
      "Congress has authority over the time, place and manner of federal elections under the Elections Clause.",
    ],
    relatedArticleSlugs: ["who-gets-to-vote", "how-a-president-is-chosen"],
    relatedDebateSlugs: ["voting-age-16", "electoral-college"],
  },
  {
    id: "iss-tech",
    slug: "technology-and-speech",
    title: "Technology and Speech",
    category: "Technology",
    summary:
      "Who is responsible for what happens online, and who decides what a platform may host, rank or remove.",
    basics: [
      "The First Amendment restricts government action on speech; it does not require private platforms to host anyone.",
      "Section 230 protects platforms both from liability for user content and when they remove content in good faith.",
      "Most AI-specific harms are currently addressed through existing sectoral law rather than a dedicated statute.",
    ],
    whyPeopleDebate:
      "Platforms now carry a large share of public political conversation while remaining private companies. That creates a genuine tension: rules that constrain them are government action on speech, and rules that do not leave enormous discretion in private hands. Neither side of that tension has a clean answer.",
    democraticViews: [
      "Democratic criticism more often focuses on harmful content that stays up — harassment, health misinformation, material affecting minors.",
      "Many Democratic lawmakers treat algorithmic amplification as a distinct act from hosting, and argue it should be regulated differently.",
      "Democratic AI proposals more often emphasise civil rights impacts, disclosure and worker displacement.",
    ],
    republicanViews: [
      "Republican criticism more often focuses on content that gets taken down, arguing platforms should not claim conduit status while making editorial choices.",
      "Many Republican lawmakers favour existing agencies and sectoral enforcement over new regulatory bodies for technology.",
      "Republican AI proposals more often emphasise avoiding rules that would slow domestic development relative to other countries.",
    ],
    otherPerspectives: [
      "Civil liberties organisations frequently oppose both parties' proposals, arguing that liability pressure produces over-removal regardless of which direction it comes from.",
      "Open-source developers argue that transparency is itself a safety mechanism and that rules written around closed systems could make the field less inspectable.",
      "Many computer scientists argue that regulation should attach to deployment in a context rather than to development, since capability is not harm.",
    ],
    democraticDisagreement:
      "Democrats are split between members focused on present-day algorithmic harms — bias in hiring and lending — who view catastrophic-risk framing as a distraction, and members who treat frontier oversight as the priority. Civil liberties Democrats oppose Section 230 repeal outright.",
    republicanDisagreement:
      "Republicans are split between those who see platform regulation as a needed check and free-market members who consider new liability or licensing a large regulatory expansion. Some Republicans have co-sponsored AI transparency requirements on national security grounds.",
    keyTerms: [
      { term: "Section 230", definition: "The 1996 provision stating a service is not treated as the publisher of content another party provides." },
      { term: "Content moderation", definition: "A platform's process for deciding what to host, rank, label or remove." },
      { term: "Frontier model", definition: "A general-purpose AI system at or near the leading edge of capability." },
      { term: "Intermediary liability", definition: "The question of when a service carrying someone else's content is responsible for it." },
    ],
    keyFacts: [
      "The First Amendment constrains government, not private platforms.",
      "Section 230 protects both hosting and good-faith removal.",
      "There is no comprehensive federal statute governing AI development.",
      "The NIST AI Risk Management Framework is voluntary.",
    ],
    relatedArticleSlugs: ["section-230-explained", "congress-and-ai-rules"],
    relatedDebateSlugs: ["social-media-liability", "ai-regulation"],
  },
  {
    id: "iss-economy",
    slug: "economy-and-work",
    title: "Economy and Work",
    category: "Economy",
    summary:
      "Wages, employment, taxation and the mechanisms government uses to influence any of them.",
    basics: [
      "The federal minimum wage is set by statute and is not indexed to inflation.",
      "Most states set their own minimum wage; where it is higher than the federal figure, the higher rate applies.",
      "The Earned Income Tax Credit raises take-home pay for lower-income working households without changing what employers pay.",
    ],
    whyPeopleDebate:
      "Economic policy involves a real trade-off that both sides sometimes pretend away: a policy can raise incomes for most affected workers and reduce employment for some, at the same time. Disagreement is often less about the facts than about which of those effects should weigh more.",
    democraticViews: [
      "Most Democratic lawmakers support raising the federal minimum wage substantially and indexing it to inflation.",
      "Democratic economic proposals more often use direct spending and public investment as instruments.",
      "Many Democrats support strengthening collective bargaining rights as a wage mechanism distinct from statutory minimums.",
    ],
    republicanViews: [
      "Most Republican lawmakers oppose large federal minimum wage increases, arguing wage floors should track local conditions.",
      "Republican proposals more often favour tax credits and reduced regulatory cost as the route to higher take-home pay.",
      "Many Republicans argue that predictable, lower taxation does more for employment than direct wage mandates.",
    ],
    otherPerspectives: [
      "Some labour economists argue indexation matters more than the level, because an unindexed floor erodes regardless of where it is set.",
      "Others argue the binding constraint on low-wage workers is housing and childcare cost rather than the hourly wage itself.",
    ],
    democraticDisagreement:
      "Democrats from lower-cost states have pushed for regional variation or longer phase-ins, arguing a single national figure ignores real differences in cost of living. Others insist on one national number.",
    republicanDisagreement:
      "Some Republicans support a moderate increase paired with automatic indexing, arguing a predictable schedule is better for business planning than recurring political fights. Others oppose a federal minimum on principle.",
    keyTerms: [
      { term: "Indexing", definition: "Automatically adjusting a figure for inflation so its real value does not fall." },
      { term: "Monopsony", definition: "A market where few employers compete for workers, letting them set wages below competitive levels." },
      { term: "Earned Income Tax Credit", definition: "A refundable federal credit raising take-home pay for lower-income working households." },
      { term: "Discretionary spending", definition: "Federal spending Congress sets each year, as opposed to spending set by existing law." },
    ],
    keyFacts: [
      "The federal minimum wage has been $7.25 per hour since July 2009.",
      "The federal minimum is not indexed to inflation.",
      "The CBO publishes estimates of earnings and employment effects of proposed wage increases.",
      "The Bureau of Labor Statistics publishes monthly employment and wage data.",
    ],
    relatedArticleSlugs: ["the-wage-floor"],
    relatedDebateSlugs: ["federal-minimum-wage"],
  },
  {
    id: "iss-foreign",
    slug: "foreign-policy-and-defense",
    title: "Foreign Policy and Defense",
    category: "Foreign Policy",
    summary:
      "How the United States sets military capacity, alliance commitments and the conditions for using force.",
    basics: [
      "Defense is the largest single component of federal discretionary spending.",
      "Congress passes a separate authorisation bill and appropriations bill for defense each year.",
      "The Constitution gives Congress the power to declare war and the president command of the armed forces, a division that has been contested for most of American history.",
    ],
    whyPeopleDebate:
      "Deterrence is invisible when it works, so the benefits of defense spending are hard to observe while the costs are on the page. That asymmetry makes the argument unusually resistant to evidence, and it cuts across both parties rather than between them.",
    democraticViews: [
      "Democratic positions vary widely; the more common argument is that increases should be tied to specific readiness needs and paired with acquisition reform.",
      "Many Democratic lawmakers emphasise alliances and diplomatic capacity as instruments alongside military capability.",
      "Many Democrats support stronger congressional war powers constraints on the use of force.",
    ],
    republicanViews: [
      "Most Republican lawmakers support higher defense budgets, arguing the strategic environment demands greater capacity.",
      "Republican positions more often emphasise capability and readiness over institutional reform as the immediate priority.",
      "Many Republicans argue deterrence failure would cost far more than the spending required to prevent it.",
    ],
    otherPerspectives: [
      "Some defense analysts argue the allocation matters more than the level — that munitions, logistics and sustainment would buy more deterrence per dollar than large platforms.",
      "Auditors and oversight bodies frequently argue that neither party takes financial management failures seriously enough to condition funding on them.",
    ],
    democraticDisagreement:
      "Democrats split sharply. Many from districts with shipyards, bases or defense manufacturing back large increases; others argue for substantial cuts. There is no single Democratic position.",
    republicanDisagreement:
      "Republicans are divided too. Fiscal conservatives and non-interventionists have voted against increases, arguing the Pentagon should not be exempt from spending discipline that applies to other agencies.",
    keyTerms: [
      { term: "Readiness", definition: "Whether forces are trained, staffed, equipped and maintained to carry out assigned missions now." },
      { term: "Deterrence", definition: "Preventing an action by making its expected cost exceed its expected gain." },
      { term: "Authorisation vs appropriation", definition: "Authorisation says what a programme may do; appropriation provides the money." },
      { term: "War powers", definition: "The contested division of authority between Congress and the president over the use of military force." },
    ],
    keyFacts: [
      "Defense is the largest single item in federal discretionary spending.",
      "The Department of Defense has not passed a full financial audit since department-wide audits began.",
      "The GAO publishes annual assessments of major weapons acquisition programmes.",
      "Authorisation and appropriation are separate votes, and authorisation alone provides no money.",
    ],
    relatedArticleSlugs: [],
    relatedDebateSlugs: ["defense-spending"],
  },
  {
    id: "iss-education",
    slug: "education-policy",
    title: "Education Policy",
    category: "Education",
    summary:
      "How schools are funded, what they are required to teach, and who gets access to what comes after.",
    basics: [
      "Most K-12 funding comes from state and local sources, with the federal share comparatively small.",
      "Because a large share of local funding comes from property taxes, school resources vary substantially between districts.",
      "College admissions criteria are set by institutions, not by federal policy.",
    ],
    whyPeopleDebate:
      "Education policy is where nearly every other political disagreement eventually surfaces, because schools distribute opportunity and transmit shared knowledge. Arguments framed as being about curriculum or testing are often arguments about who decides.",
    democraticViews: [
      "Many Democratic lawmakers prioritise equalising funding between districts and increasing federal support for lower-income schools.",
      "Democratic education policymakers have more often supported test-optional admissions, framing requirements as an access barrier.",
      "Many Democrats support expanding public preschool and reducing student debt burdens.",
    ],
    republicanViews: [
      "Many Republican lawmakers prioritise parental choice, including charter schools and education savings accounts.",
      "Republican education policymakers have more often supported keeping standardized testing requirements as objective measures.",
      "Many Republicans argue curriculum decisions belong to states and local boards rather than federal agencies.",
    ],
    otherPerspectives: [
      "Some admissions researchers argue the decisive variable is how scores are used — as a threshold they exclude, read in school context they can identify students a transcript alone would miss.",
      "Many teachers argue that both parties' proposals underweight staffing and class size, which they consider the binding constraint.",
    ],
    democraticDisagreement:
      "Democrats are genuinely split on testing. Some prominent progressive researchers argue removing tests hurts high-achieving low-income students most, because a strong score is often their clearest available signal. Democrats also differ sharply on charter schools.",
    republicanDisagreement:
      "Republicans differ on federal involvement. Some support federal school choice programmes; others argue any federal education policy is itself the problem and the department should be reduced.",
    keyTerms: [
      { term: "Test-optional", definition: "A policy letting applicants decide whether to submit standardized test scores." },
      { term: "Predictive validity", definition: "How well a measure forecasts a later outcome, such as first-year college grades." },
      { term: "Holistic review", definition: "Evaluating an application across many factors rather than by a formula." },
      { term: "Title I", definition: "Federal funding directed to schools serving a high share of students from low-income families." },
    ],
    keyFacts: [
      "Most K-12 funding is state and local rather than federal.",
      "Admissions criteria are set by individual institutions.",
      "Test-optional and test-blind are distinct policies.",
      "NCES publishes national data on enrolment and admissions criteria.",
    ],
    relatedArticleSlugs: ["one-number"],
    relatedDebateSlugs: ["standardized-testing"],
  },
  {
    id: "iss-climate",
    slug: "climate-and-energy",
    title: "Climate and Energy",
    category: "Environment",
    summary:
      "How energy is produced and paid for, and which instruments government uses to change either.",
    basics: [
      "The United States has no national carbon price; some states operate regional programmes.",
      "Current federal climate policy relies mainly on tax credits, direct spending and regulation.",
      "The EPA publishes an annual national greenhouse gas inventory by sector.",
    ],
    whyPeopleDebate:
      "The costs of energy policy are immediate, concentrated and visible; the benefits are distant, diffuse and statistical. That asymmetry structures the whole argument, and it is why instrument choice generates more heat than the goal does.",
    democraticViews: [
      "Democratic climate policy has largely moved toward subsidies, tax credits and direct investment rather than carbon pricing.",
      "Many Democratic lawmakers support emissions regulation of the highest-emitting sectors under existing statutory authority.",
      "Many Democrats prioritise transmission capacity, which they argue is the current binding constraint on clean deployment.",
    ],
    republicanViews: [
      "Most Republican lawmakers oppose a carbon tax, generally arguing it raises energy costs and functions as a broad tax increase.",
      "Many Republicans prioritise domestic energy production and permitting reform across all energy sources.",
      "Republican proposals more often emphasise innovation funding over mandates or pricing.",
    ],
    otherPerspectives: [
      "Environmental justice organisations have opposed cap-and-trade specifically, arguing tradable permits let pollution concentrate in particular communities even as national totals fall.",
      "Some analysts argue the design question — border adjustments, dividends — matters more than the yes-or-no question about pricing.",
    ],
    democraticDisagreement:
      "Democrats disagree substantially on instruments. Some Democratic economists continue to argue pricing is more efficient than subsidies, while environmental justice groups within the coalition oppose trading systems on distributional grounds.",
    republicanDisagreement:
      "A group of Republican economists and former officials has publicly advocated a carbon tax with dividends as the market-based alternative to regulation. It remains a minority position within the party.",
    keyTerms: [
      { term: "Externality", definition: "A cost or benefit of an activity falling on someone who was not part of the decision." },
      { term: "Cap-and-trade", definition: "A system setting a total emissions limit and issuing tradable permits within it." },
      { term: "Carbon dividend", definition: "Returning carbon price revenue to households, usually as an equal per-person payment." },
      { term: "Border carbon adjustment", definition: "A charge on imports reflecting embedded emissions, to stop production simply relocating." },
    ],
    keyFacts: [
      "A carbon tax sets a price and lets quantity adjust; cap-and-trade sets a quantity and lets price adjust.",
      "The U.S. has no national carbon price.",
      "The EPA publishes annual greenhouse gas emissions data by sector.",
      "Current federal policy relies primarily on credits, spending and regulation.",
    ],
    relatedArticleSlugs: [],
    relatedDebateSlugs: ["carbon-pricing"],
  },
];

export const ISSUE_BY_SLUG = new Map(ISSUES.map((i) => [i.slug, i]));

export function getIssue(slug: string): Issue | undefined {
  return ISSUE_BY_SLUG.get(slug);
}

import type { Debate } from "@/types/ngn";
import { SOURCES } from "./sources";

/**
 * DEMO CONTENT — see `data/demo/README.md`.
 *
 * Eight seeded debates. Every question here is a durable civic question rather
 * than a breaking-news event: nothing in this file should ever be mistaken for
 * a report of something that happened today. Participation counts, sentiment
 * splits and average scores are illustrative.
 *
 * The `argumentBank` supplies the demo opponent's lines. Each side gets real,
 * good-faith arguments — an opponent who argues badly would teach students
 * nothing.
 */

export const DEBATES: Debate[] = [
  /* ======================================================================
     1 — Voting age (featured)
     ====================================================================== */
  {
    id: "dbt-voting-age",
    slug: "voting-age-16",
    title: "Should the voting age be lowered to 16?",
    description:
      "Sixteen-year-olds can work, pay income tax and drive. Whether that adds up to a vote is a question about what the franchise is for.",
    category: "Politics",
    difficulty: "Introductory",
    format: "standard",
    status: "live",
    featured: true,
    tags: ["Voting rights", "Constitution", "Youth policy"],
    estimatedMinutes: 15,
    participants: 1284,
    averageScore: 78,
    hoursRemaining: 9,
    sentiment: { support: 48, oppose: 42, undecided: 10 },
    relatedArticleSlug: "who-gets-to-vote",
    relatedIssueSlug: "voting-and-elections",
    brief: {
      question:
        "Should the legal voting age in United States federal elections be lowered from 18 to 16?",
      sixtySecond: [
        "The voting age in federal elections is 18. It was set there by the 26th Amendment, ratified in 1971, largely in response to the argument that Americans old enough to be drafted at 18 should be old enough to vote.",
        "Lowering it again would require either a constitutional amendment for federal elections or, more narrowly, state and local action — several cities already allow 16-year-olds to vote in municipal or school board elections.",
        "The disagreement is not mainly about whether teenagers care about politics. It is about what the vote is for: a reward for demonstrated maturity, or a right that attaches to anyone the government's decisions bind.",
      ],
      supporterArguments: [
        "Sixteen-year-olds are subject to laws they cannot vote on. They pay income and payroll taxes when they work, can be tried as adults in some circumstances, and live under school, labour and climate policy set entirely by others.",
        "Voting is habit-forming. Research on turnout suggests that people who cast a first ballot while still in a stable home and school environment are more likely to keep voting for life than people who first become eligible during the disruption of moving out or starting work.",
        "The developmental research distinguishes between 'cold' cognition — reasoned decisions made with time and information, like voting — and 'hot' cognition under peer pressure. On the cold measures, 16-year-olds perform comparably to adults.",
        "Countries and jurisdictions that lowered the age, including Austria for national elections, have not produced the failures opponents predicted, and in some cases 16- and 17-year-olds turned out at higher rates than voters in their twenties.",
      ],
      opponentArguments: [
        "The line has to sit somewhere, and 18 is where the law already places the transition to adulthood for contracts, jury service and most criminal responsibility. Moving the vote alone makes the boundary incoherent.",
        "Most 16-year-olds still live with and depend on their parents. Critics argue this creates real pressure to vote as the household votes, which effectively hands some adults extra influence rather than giving teenagers independent voice.",
        "Civic knowledge is unevenly taught. Opponents argue that adding voters who have not yet finished a government course widens the gap between voters who understand what is on the ballot and voters who do not.",
        "Where 16-year-olds already can vote in local elections, turnout has often been low, which opponents read as evidence that the demand for the change comes more from advocacy organisations than from teenagers themselves.",
      ],
      democraticView:
        "Support for lowering the voting age is more common among Democratic lawmakers, and House Democrats have repeatedly offered amendments to lower it for federal elections. The argument usually made is a rights argument: people governed by a law should have a say in it.",
      republicanView:
        "Most Republican lawmakers have opposed lowering the federal voting age, generally arguing that 18 reflects a considered judgment about adult responsibility and that election rules should be changed rarely and deliberately.",
      democraticDisagreement:
        "Democrats are far from unified. Many Democratic officials in competitive districts have declined to back it, some arguing it is a distraction from ballot access fights they consider more urgent, and others simply not persuaded that 16 is the right line.",
      republicanDisagreement:
        "Some Republicans, particularly in the party's libertarian wing, have argued that if 16-year-olds are taxed and can be prosecuted, consistency favours letting them vote. Others support it at the local level while opposing it federally.",
      otherPerspectives: [
        "Some election administrators focus on a practical question rather than a philosophical one: registration systems, school schedules and ID rules would all need redesign, and they argue that should be settled before the age is.",
        "A separate strand of the argument holds that the debate is aimed at the wrong variable — that civic education, not age, is what determines whether a new voter casts an informed ballot.",
      ],
      keyFacts: [
        "The 26th Amendment, ratified in 1971, prohibits denying the vote to citizens 18 or older on account of age.",
        "States set voting qualifications for their own elections within federal constitutional limits, which is why some municipalities have lowered the age locally without a federal change.",
        "Lowering the federal voting age below 18 would, in most legal readings, require a constitutional amendment rather than ordinary legislation.",
        "Several U.S. cities allow 16- and 17-year-olds to vote in local or school board elections; Austria lowered its national voting age to 16 in 2007.",
        "Sixteen-year-olds who work are subject to federal income and payroll tax withholding on the same terms as adults.",
      ],
      statistics: [
        {
          value: "1971",
          label: "Year the 26th Amendment set the federal voting age at 18",
          sourceId: "archives-amendments",
        },
        {
          value: "18",
          label: "Current minimum voting age in U.S. federal elections",
          sourceId: "archives-amendments",
        },
      ],
      keyTerms: [
        {
          term: "26th Amendment",
          definition:
            "The 1971 constitutional amendment barring the federal government and the states from denying the vote to citizens 18 or older because of their age.",
        },
        {
          term: "Franchise",
          definition: "The legal right to vote in public elections.",
        },
        {
          term: "Constitutional amendment",
          definition:
            "A change to the Constitution, requiring two-thirds of both houses of Congress (or a convention) and ratification by three-quarters of the states.",
        },
        {
          term: "Turnout",
          definition:
            "The share of eligible voters who actually cast a ballot in a given election.",
        },
      ],
      sources: [
        SOURCES.archivesAmendments,
        SOURCES.censusVoting,
        SOURCES.fecData,
        SOURCES.pewResearch,
        SOURCES.brookings,
      ],
    },
    argumentBank: {
      support: {
        opening: [
          "If the government can tax your paycheck, set your school's curriculum and prosecute you, it owes you a say in who writes those rules. A 16-year-old with a job has federal income tax withheld on exactly the same terms as a 40-year-old. We do not otherwise accept taxation without representation, and I do not think the burden should fall on the teenager to prove they deserve the vote — it should fall on the state to justify withholding it.",
          "Voting is a habit before it is a decision. The strongest case for 16 is not that teenagers are unusually wise; it is that a first ballot cast while someone still has a fixed address, a school and an adult to ask questions of is far more likely to become a lifelong pattern than a first ballot at 18, when most people are moving, starting work, or both. Austria has run this experiment nationally since 2007, and turnout among its youngest voters has not collapsed.",
        ],
        rebuttal: [
          "You argue that 18 is where the law already draws adulthood, so moving the vote alone makes the boundary incoherent. But the boundary is already incoherent: 16-year-olds can drive, work, pay tax and in many states be tried as adults, while 21 governs alcohol and 25 governs a House seat. The law sets different ages for different capacities because different capacities mature differently. Voting asks for deliberation with time and information, and that is precisely the capacity the developmental research finds is adult-like by 16.",
          "Your claim that teenagers would simply vote as their parents do is the strongest thing you have said, and it deserves a real answer rather than a dismissal. Two responses. First, plenty of adults vote as their households do, and we do not disenfranchise them for it. Second, the data from jurisdictions that have lowered the age does not show 16-year-olds voting in lockstep with their parents at rates that differ much from young adults.",
        ],
        counter: [
          "Let me concede the practical point honestly: registration systems and ID rules would need real redesign, and election administrators are right to raise it. That is an argument about sequencing, not about whether the right exists. If the objection is that implementation is hard, the answer is to do the implementation work, not to leave a class of taxed and governed people without a vote while we wait.",
        ],
        closing: [
          "The question is not whether 16-year-olds are as experienced as adults. They are not, and neither are plenty of 18-year-olds. The question is what the vote is for. If it is a reward for demonstrated maturity, we would need a test, and we abandoned tests for good reason. If it is a right that attaches to anyone the state's decisions bind, then the people who are taxed, schooled and policed under those decisions have the strongest claim of anyone.",
        ],
      },
      oppose: {
        opening: [
          "Every legal system has to draw a line where childhood ends, and drawing it badly costs something real. At 18 the law recognises a person as able to sign a binding contract, serve on a jury, and answer fully for a crime. Moving the vote to 16 while leaving those at 18 does not extend a right so much as it detaches voting from the rest of adult responsibility, and I have not heard a principled account of why that particular capacity should come first.",
          "I want to take the taxation argument seriously rather than wave at it, because it is the strongest one on the other side. But we already accept the principle it violates. Non-citizen residents pay income tax and cannot vote. People under 18 who work pay tax and cannot vote. Taxation has never been the criterion for the franchise in American law; residency, citizenship and age have been. If taxation were the test, the reform we would be debating is a very different one.",
        ],
        rebuttal: [
          "You argued that voting is habit-forming and that a first ballot at 16 sticks better. I do not dispute the finding, but notice what it establishes: that lowering the age would raise long-run turnout. That is an argument about a good outcome, not about who has a right to decide. If turnout alone justified extending the franchise we would have to consider lowering it further, and I assume you would stop somewhere. I am asking you to name where, and why there.",
          "Your point about cold cognition is the part of your case I find most serious, and I will grant it: on untimed, information-rich decisions, 16-year-olds test close to adults. But voting is not always cold. It happens inside households, classrooms and friend groups with real social pressure, and the same research you are citing finds that is exactly where adolescent judgment diverges most from adult judgment.",
        ],
        counter: [
          "You will say that adults are also influenced by their households, and that is fair. The difference is dependence. A 30-year-old who disagrees with their family can leave the room; a 16-year-old living at home, financially dependent, with a parent watching them fill in a mail ballot, is in a materially different position. Extending the vote into that setting does not obviously add an independent voice — it may just give some adults a second one.",
        ],
        closing: [
          "I am not arguing that teenagers are incapable or uninterested. I am arguing that 18 is a defensible line, that it was set deliberately in 1971 after a national argument, and that the case for moving it has to clear a higher bar than showing that some 16-year-olds would vote well. Change the civics curriculum, lower the age for school board elections where the stake is direct, but do not detach the vote from the rest of adulthood without a clearer account of why.",
        ],
      },
    },
  },

  /* ======================================================================
     2 — Electoral College
     ====================================================================== */
  {
    id: "dbt-electoral-college",
    slug: "electoral-college",
    title: "Should the Electoral College be abolished?",
    description:
      "A system that can elect a president who lost the popular vote — deliberate design, or a defect worth amending away?",
    category: "Politics",
    difficulty: "Intermediate",
    format: "standard",
    status: "live",
    featured: false,
    tags: ["Constitution", "Elections", "Federalism"],
    estimatedMinutes: 18,
    participants: 942,
    averageScore: 81,
    hoursRemaining: 22,
    sentiment: { support: 44, oppose: 45, undecided: 11 },
    relatedIssueSlug: "voting-and-elections",
    brief: {
      question:
        "Should the United States abolish the Electoral College and elect the president by national popular vote?",
      sixtySecond: [
        "Americans do not vote directly for president. They vote for electors, and there are 538 of them, allocated to states by their combined House and Senate seats. A candidate needs 270 to win.",
        "Because almost every state awards all of its electors to whoever wins that state, it is possible to win the presidency while losing the national popular vote. This has happened five times.",
        "Abolition would require a constitutional amendment. A separate approach, the National Popular Vote Interstate Compact, tries to reach the same outcome by having states pledge their electors to the national winner — which raises its own legal questions.",
      ],
      supporterArguments: [
        "One person, one vote is the standard applied to nearly every other American election. The Electoral College is the conspicuous exception, and it makes a vote in a small state worth measurably more than a vote in a large one.",
        "Because most states are safely one party or the other, general election campaigning concentrates in a handful of competitive states. Supporters of abolition argue this distorts which problems get presidential attention.",
        "Five presidents have taken office after losing the popular vote. Supporters argue that each such outcome costs the office legitimacy at exactly the moment it needs it most.",
        "The original design assumed electors would exercise independent judgment. They no longer do — they are party loyalists bound by state law — so the institution no longer performs the function it was built for.",
      ],
      opponentArguments: [
        "The Electoral College forces candidates to build geographically broad coalitions rather than running up margins in the largest metropolitan areas. Opponents of abolition argue this is a feature of a federal republic, not a bug.",
        "A national popular vote would nationalise recounts. Under the current system a disputed result is usually contained within one state; without it, a close national margin could trigger a recount across every jurisdiction in the country.",
        "Smaller states agreed to join the union under a system that gave them weight beyond their population, in the Senate and in the College. Opponents argue that removing it unilaterally breaks a foundational bargain.",
        "The practical objection: an amendment requires three-quarters of the states to ratify, and the states that would lose relative influence are numerous enough to block it. Opponents argue reform energy is better spent elsewhere.",
      ],
      democraticView:
        "Support for abolition is considerably more common among Democratic officials, and most states that have joined the National Popular Vote Interstate Compact have Democratic legislatures. The argument usually made is the equal-weight argument.",
      republicanView:
        "Most Republican lawmakers defend the Electoral College, typically on federalism grounds — that the states, not a single national electorate, are the constitutional units that choose a president.",
      democraticDisagreement:
        "Democratic election lawyers are split on the interstate compact specifically. Some argue it is a lawful use of state power over electors; others warn it invites a constitutional crisis if a state tries to withdraw after an election, and would rather pursue a formal amendment.",
      republicanDisagreement:
        "Some Republicans have proposed reform short of abolition — allocating electors by congressional district, or proportionally — which would change outcomes substantially while keeping the College. Others consider any change a threat to the federal structure.",
      otherPerspectives: [
        "A group of election scholars argues the real distortion is winner-take-all allocation, which is state law rather than constitutional text, and could be changed without an amendment at all.",
      ],
      keyFacts: [
        "There are 538 electors; 270 are required to win the presidency.",
        "A state's elector count equals its House delegation plus its two senators; the District of Columbia has three under the 23rd Amendment.",
        "Maine and Nebraska allocate some electors by congressional district; every other state uses winner-take-all.",
        "Five presidents have won the Electoral College while losing the national popular vote.",
        "Abolishing the College outright requires a constitutional amendment: two-thirds of both houses of Congress and ratification by 38 states.",
      ],
      statistics: [
        { value: "538", label: "Total electors", sourceId: "archives-ec" },
        { value: "270", label: "Electoral votes needed to win", sourceId: "archives-ec" },
        { value: "38", label: "States required to ratify an amendment", sourceId: "archives-amendments" },
      ],
      keyTerms: [
        {
          term: "Elector",
          definition:
            "A person appointed by a state to cast one of that state's votes for president in the Electoral College.",
        },
        {
          term: "Winner-take-all",
          definition:
            "A state rule awarding all of its electoral votes to the candidate who wins the most votes in that state. It is state law, not constitutional text.",
        },
        {
          term: "National Popular Vote Interstate Compact",
          definition:
            "An agreement among states to award their electors to the national popular vote winner, taking effect only if states holding 270 electors join.",
        },
        {
          term: "Faithless elector",
          definition:
            "An elector who votes for someone other than the candidate they were pledged to. Most states now legally bind their electors.",
        },
      ],
      sources: [
        SOURCES.archivesElectoralCollege,
        SOURCES.archivesAmendments,
        SOURCES.fecData,
        SOURCES.supremeCourtOpinions,
        SOURCES.brookings,
        SOURCES.cato,
      ],
    },
    argumentBank: {
      support: {
        opening: [
          "We apply one person, one vote to every other election in this country. Governors, senators, mayors, ballot initiatives — all of them are decided by counting people. The presidency is the single exception, and the exception has a measurable cost: because electors track House seats plus two, a voter in the smallest states carries several times the weight of a voter in the largest. That is not federalism working as intended; that is an artefact of a formula nobody would choose today.",
          "The Electoral College was designed for electors who would deliberate and exercise independent judgment about who should be president. That institution no longer exists. Electors are party loyalists, most are legally bound by their states, and the Supreme Court has upheld those binding laws. What remains is not the framers' design — it is a scoring rule that occasionally hands the office to the candidate fewer people chose.",
        ],
        rebuttal: [
          "You argued that the College forces candidates to build geographically broad coalitions. I would test that claim against how campaigns actually behave. In practice, general election attention concentrates in a handful of competitive states while the largest states in the country and the smallest are both ignored, because both are safe. The system is not producing geographic breadth; it is producing an intense focus on a rotating handful of states.",
          "Your recount point is the strongest thing you have raised, and I want to answer it directly rather than dodge. A national recount would be harder to administer than a single-state one. But notice that the current system does not eliminate that risk — it concentrates it, so that a few thousand votes in one state can decide everything, which is a worse failure mode, not a better one. The fix is uniform federal recount standards, and those are worth having regardless.",
        ],
        counter: [
          "I will concede the amendment math honestly: three-quarters of the states is a very high bar, and the states that would lose relative weight can block it. That makes abolition hard. It does not make it wrong, and it is not actually the question on the table — I am arguing about what the rule should be, not predicting whether Congress will pass it this session.",
        ],
        closing: [
          "Strip away the history and ask a simpler question: if we were writing the Constitution now, with no institution to defend, would anyone propose that the president be chosen by a body of 538 people whose seats are apportioned by a formula that overweights small states, allocated by a winner-take-all rule found nowhere in the text, and that has five times produced a president fewer voters chose? I do not think anyone would. That is the case.",
        ],
      },
      oppose: {
        opening: [
          "The United States is a federal republic, and the president is chosen by the states — that is not an accident of drafting, it is the same principle that gives Wyoming two senators. If you find the Electoral College indefensible, you have to explain why the Senate is not indefensible on identical grounds. Most abolitionists do not want to make that argument, which suggests the objection is less about the principle than about a handful of outcomes.",
          "Consider what a national popular vote does to a close election. Right now a disputed result is contained: it happens in one state, under one set of rules, with one recount procedure. Remove the state boundaries and a national margin of a few thousand votes puts every precinct in the country in play at once, under fifty different recount laws. We have no national election administration capable of resolving that, and building one is a far larger constitutional change than the one being proposed.",
        ],
        rebuttal: [
          "You argued that campaigns already ignore most states, so the College fails at producing geographic breadth. That is a fair description of the symptom but you have misdiagnosed the cause. What concentrates attention on a few states is winner-take-all allocation — which is state law, not the Constitution. Maine and Nebraska already do it differently. If your real objection is to winner-take-all, we may agree more than you think, and it does not require an amendment.",
          "Your point that electors no longer deliberate is true and I will grant it fully. But an institution can outlive its original rationale and still serve a function. The College now operates as a firewall that localises disputes and forces coalitions across regions. Judging it by whether it does the thing it did in 1789 is a bit like judging the Senate by whether legislatures still appoint senators.",
        ],
        counter: [
          "On the five popular-vote losers: each one was decided under rules every candidate knew in advance and campaigned around. A candidate optimising for electoral votes runs a different campaign than one optimising for raw totals, so the popular vote in those elections is not a clean counterfactual for who would have won under different rules. It tells you who got more votes under a system where getting more votes was not the objective.",
        ],
        closing: [
          "I am not arguing the current system is elegant. I am arguing that the alternative on offer has real costs that its supporters consistently understate: nationalised recounts with no national administrator, the loss of the federal principle that also underwrites the Senate, and an amendment path that cannot pass. Reform winner-take-all, standardise recounts, fix what is actually broken — but do not tear out the structural piece and assume the building stands.",
        ],
      },
    },
  },

  /* ======================================================================
     3 — Platform liability
     ====================================================================== */
  {
    id: "dbt-platform-liability",
    slug: "social-media-liability",
    title: "Should social media companies be legally responsible for harmful content?",
    description:
      "A 1996 statute decides who can be sued when a post causes harm. Rewriting it is one of the few things both parties say they want.",
    category: "Technology",
    difficulty: "Advanced",
    format: "deep",
    status: "live",
    featured: false,
    tags: ["Section 230", "Free speech", "Platform regulation"],
    estimatedMinutes: 32,
    participants: 1103,
    averageScore: 76,
    hoursRemaining: 40,
    sentiment: { support: 51, oppose: 36, undecided: 13 },
    relatedArticleSlug: "section-230-explained",
    relatedIssueSlug: "technology-and-speech",
    brief: {
      question:
        "Should online platforms be legally liable for harmful content that their users post, rather than protected from most such suits?",
      sixtySecond: [
        "Section 230 of the Communications Decency Act, passed in 1996, says an interactive computer service is not treated as the publisher of content someone else provides. In practice this means platforms usually cannot be sued over user posts.",
        "The same statute also protects platforms when they remove content in good faith — which is why it is invoked both by people who want less moderation and by people who want more.",
        "Proposals range from full repeal to narrow carve-outs for specific harms to conditioning the protection on transparency requirements. The disagreement runs through both parties rather than between them.",
      ],
      supporterArguments: [
        "Platforms are no longer neutral pipes. Ranking algorithms decide what billions of people see, and supporters of liability argue that an editorial decision made by a recommendation system is still an editorial decision.",
        "Almost every other industry bears some duty of care for foreseeable harm its design causes. Supporters argue there is no principled reason technology companies alone should be exempt.",
        "Without exposure to liability, the cost of harm falls entirely on the people harmed, while the revenue from engagement accrues to the platform. Supporters argue liability is what realigns those incentives.",
        "Narrow reform is possible. Congress has already carved out exceptions, which supporters cite as proof that targeted changes do not collapse the internet.",
      ],
      opponentArguments: [
        "Liability at scale means pre-emptive removal. Opponents argue that a platform facing suits over billions of posts will delete anything remotely risky, and the speech that disappears first is the speech of people without lawyers.",
        "Section 230 protects small platforms far more than large ones. A major company can absorb litigation costs; a forum, a wiki or a startup cannot. Opponents argue repeal entrenches the incumbents it is meant to punish.",
        "The First Amendment already limits what liability can attach to speech. Opponents argue many proposals would be struck down, producing years of uncertainty and no protection.",
        "The good-faith moderation protection is part of the same statute. Opponents warn that weakening it makes platforms more reluctant to remove harmful content, not less.",
      ],
      democraticView:
        "Democratic criticism of Section 230 tends to focus on harmful content platforms leave up — harassment, health misinformation, material affecting minors — and on algorithmic amplification as a distinct act from hosting.",
      republicanView:
        "Republican criticism more often focuses on content platforms take down, arguing that companies claiming a neutral-conduit protection while making editorial choices should not have both.",
      democraticDisagreement:
        "Democrats are genuinely split. Civil liberties Democrats and many technology-focused members warn that liability would silence marginalised speakers first, and oppose repeal as firmly as any Republican.",
      republicanDisagreement:
        "Republicans are split too. Free-market and small-government Republicans argue that expanding liability is a large new regulatory intervention, while others treat platform reform as a priority.",
      otherPerspectives: [
        "Some legal scholars argue the fight over Section 230 is misdirected — that the First Amendment, not the statute, does most of the work protecting platforms, so repeal would change less than either side expects.",
        "Product-safety researchers frame it differently again: regulate the design of engagement systems directly, the way other consumer products are regulated, rather than litigating individual posts.",
      ],
      keyFacts: [
        "Section 230 was enacted in 1996 as part of the Communications Decency Act.",
        "It has two operative parts: platforms are not treated as publishers of user content, and platforms are protected when removing objectionable content in good faith.",
        "Section 230 does not shield platforms from federal criminal law or from intellectual property claims.",
        "Congress narrowed the protection in 2018 with respect to content facilitating sex trafficking, establishing that targeted carve-outs are possible.",
        "The First Amendment independently limits government regulation of speech, including some proposals to condition liability on moderation choices.",
      ],
      statistics: [
        { value: "1996", label: "Year Section 230 was enacted", sourceId: "section-230" },
        { value: "26", label: "Words in the statute's core provision", sourceId: "section-230" },
      ],
      keyTerms: [
        {
          term: "Section 230",
          definition:
            "The provision of federal law stating that an interactive computer service is not treated as the publisher or speaker of information provided by another party.",
        },
        {
          term: "Intermediary liability",
          definition:
            "The legal question of when a service that carries someone else's content is responsible for it.",
        },
        {
          term: "Algorithmic amplification",
          definition:
            "A system's decision to show particular content to particular users, distinct from merely storing it.",
        },
        {
          term: "Duty of care",
          definition:
            "A legal obligation to take reasonable steps to avoid foreseeable harm to others.",
        },
      ],
      sources: [
        SOURCES.section230Text,
        SOURCES.supremeCourtOpinions,
        SOURCES.ftcConsumerProtection,
        SOURCES.pewResearch,
        SOURCES.cato,
        SOURCES.brookings,
      ],
    },
    argumentBank: {
      support: {
        opening: [
          "Section 230 was written for a web of message boards, where a service really was a passive pipe. That is not what a modern platform is. A ranking system that decides which of a billion posts appears in front of a specific 14-year-old is making an editorial judgment, and we do not let any other industry make editorial judgments at scale while claiming the legal status of a bulletin board.",
          "Every other product in America carries some duty of care. A carmaker that knows its design causes foreseeable harm and ships it anyway is liable. Platforms have internal research on foreseeable harms and ship anyway, and the entire cost of that decision falls on the people harmed rather than the company earning the revenue. Liability is simply the mechanism that puts the cost back where the decision was made.",
        ],
        rebuttal: [
          "You argued that liability means pre-emptive removal, and that the speech deleted first belongs to people without lawyers. That is a serious concern and I am not going to pretend otherwise. But notice it is an argument against a badly drafted statute, not against liability as such. A duty of care attached to design decisions — how a recommendation system is built and tested — does not require a platform to adjudicate individual posts at all.",
          "On small platforms: you are right that a startup cannot absorb what a large company can, and any reform that ignores that would entrench incumbents. That is an argument for scaling the duty to size and reach, which Congress does routinely in other regulation. It is not an argument for exempting the largest communication systems ever built.",
        ],
        counter: [
          "I want to grant the First Amendment point properly, because it is the strongest thing on your side. Some proposals would be struck down. But 'some versions of this are unconstitutional' is true of nearly every area of law, and courts have consistently held that a duty of care aimed at conduct and design, rather than at the content of speech, survives review. The constitutional constraint shapes the reform; it does not forbid it.",
        ],
        closing: [
          "The choice is not between the current statute and a censored internet. It is between a rule written in 1996 for a technology that no longer exists, and a rule that asks the companies making design choices to bear some of the cost of those choices. Every other industry lives under the second kind of rule. I have not heard a reason why the ones with the most reach should live under the first.",
        ],
      },
      oppose: {
        opening: [
          "Ask who actually gets silenced when liability arrives. A platform facing suits over billions of posts does not hire more careful moderators; it sets its filters to delete anything that could conceivably be actionable. The posts that survive are the ones from people with legal departments. The posts that vanish are the abuse victim naming her abuser, the activist documenting a crackdown, the student criticising a school district. That is not a hypothetical — it is what happened in the areas Congress has already carved out.",
          "Section 230 is what makes it possible for anything other than the largest companies to exist online. A major platform can absorb ten thousand lawsuits as a cost of business. A hobbyist forum, a wiki, a nonprofit archive, a startup cannot absorb one. Repeal is often framed as a check on big technology companies; in practice it is the surest way to guarantee that only big technology companies remain.",
        ],
        rebuttal: [
          "You argued that ranking is an editorial judgment, so platforms should be treated as publishers. Follow that where it goes. A search engine ranks. An email client filters spam. A group chat orders messages by time. All of those are decisions about what a user sees, and under your standard all of them become publishers of everything they carry. If your rule needs an exception for every case where it produces an absurd result, the rule is doing the wrong work.",
          "Your duty-of-care analogy to product safety is the most interesting thing you have said, and I will concede that design regulation is a more coherent target than post-by-post liability. But notice you have just left the topic. Regulating how a recommendation system is tested is not making a company liable for what a user posted, which is the question in front of us.",
        ],
        counter: [
          "On the 2018 carve-out as proof that narrow reform works: the evidence there cuts the other way. The measurable effects included platforms broadly removing lawful speech in adjacent categories, and researchers documenting harm to the people the law was written to protect. That is exactly the over-removal dynamic I described, observed in the one natural experiment we have.",
        ],
        closing: [
          "I share the concern about what these systems do to people, particularly to minors. I do not think the answer is a liability rule whose first and most predictable effect is that platforms delete anything risky and only the largest survive to do the deleting. Regulate the design. Require the transparency. Enforce the laws already on the books. But do not hand every platform a legal incentive to remove first and ask nothing.",
        ],
      },
    },
  },

  /* ======================================================================
     4 — Minimum wage
     ====================================================================== */
  {
    id: "dbt-minimum-wage",
    slug: "federal-minimum-wage",
    title: "Should the federal minimum wage be significantly increased?",
    description:
      "The federal floor has been $7.25 since 2009. What raising it would do to wages and to jobs is a genuine empirical dispute.",
    category: "Economy",
    difficulty: "Intermediate",
    format: "standard",
    status: "ongoing",
    featured: false,
    tags: ["Labour", "Wages", "Federal policy"],
    estimatedMinutes: 16,
    participants: 867,
    averageScore: 79,
    hoursRemaining: 61,
    sentiment: { support: 55, oppose: 34, undecided: 11 },
    relatedIssueSlug: "economy-and-work",
    brief: {
      question:
        "Should Congress significantly increase the federal minimum wage above its current level of $7.25 per hour?",
      sixtySecond: [
        "The federal minimum wage has been $7.25 an hour since 2009. It does not adjust for inflation, so its purchasing power falls every year Congress does not act.",
        "Most states and many cities set higher minimums, so the federal floor binds mainly in states that have not raised their own.",
        "The economic dispute is real and unresolved: raising the wage raises pay for workers who keep their jobs, and the contested question is how many jobs or hours are lost, and where.",
      ],
      supporterArguments: [
        "A full-time worker at $7.25 earns roughly $15,000 a year before tax. Supporters argue no full-time job in a wealthy country should leave a worker below a basic standard of living.",
        "Because the federal minimum is not indexed, its real value has fallen substantially since 2009. Supporters argue that inaction is itself a policy choice — a slow cut.",
        "A large body of recent research on state and city increases finds employment effects near zero across the ranges studied, which supporters read as evidence the classic prediction was overstated.",
        "Higher wages reduce turnover and the cost of constantly rehiring and retraining, which supporters argue offsets part of the direct cost to employers.",
      ],
      opponentArguments: [
        "A single national floor lands very differently in a high-cost city and a rural county. Opponents argue a rate that is modest in one place can exceed prevailing wages in another, where the employment effect would be real.",
        "The Congressional Budget Office has estimated that large increases raise earnings for many workers while reducing employment for some. Opponents argue that trade-off should be stated plainly rather than assumed away.",
        "Employers can respond in ways that do not show up as layoffs — cutting hours, automating, or not opening a location — so opponents argue employment studies understate the effect.",
        "Opponents often prefer targeting the same goal through the Earned Income Tax Credit, which raises take-home pay without raising the cost of hiring.",
      ],
      democraticView:
        "Most Democratic lawmakers support a substantial increase and indexing the wage to inflation so it does not require repeated votes. The argument is usually framed around a wage floor a full-time job should clear.",
      republicanView:
        "Most Republican lawmakers oppose large federal increases, generally arguing that wage floors should reflect local conditions and that the same goal is better pursued through tax credits.",
      democraticDisagreement:
        "Democrats disagree about the number and the mechanism. Some from lower-cost states have pushed for regional variation or longer phase-ins, arguing a single national figure ignores real cost-of-living differences.",
      republicanDisagreement:
        "Some Republicans support a moderate increase paired with indexing, arguing that a predictable schedule is better for business planning than periodic political fights. Others oppose any federal minimum on principle.",
      otherPerspectives: [
        "Some labour economists argue the more important variable is not the level but the indexation: a lower wage that adjusts automatically may do more over a decade than a higher one that erodes.",
      ],
      keyFacts: [
        "The federal minimum wage has been $7.25 per hour since July 2009.",
        "The federal minimum is not indexed to inflation and changes only when Congress passes a law.",
        "Most states set a minimum wage above the federal floor; where a state minimum is higher, the higher rate applies.",
        "A separate, lower federal cash wage applies to tipped workers, with employers required to make up the difference if tips fall short.",
        "The Congressional Budget Office publishes estimates of the effects of proposed increases on earnings, employment and poverty.",
      ],
      statistics: [
        { value: "$7.25", label: "Federal minimum wage per hour", sourceId: "dol-minimum-wage" },
        { value: "2009", label: "Year of the last federal increase", sourceId: "dol-minimum-wage" },
      ],
      keyTerms: [
        {
          term: "Minimum wage",
          definition: "The lowest hourly wage an employer may legally pay a covered worker.",
        },
        {
          term: "Indexing",
          definition:
            "Automatically adjusting a figure for inflation, so its real value does not fall without a new vote.",
        },
        {
          term: "Earned Income Tax Credit",
          definition:
            "A refundable federal tax credit that raises take-home pay for lower-income working households.",
        },
        {
          term: "Monopsony",
          definition:
            "A market where few employers compete for workers, letting them set wages below what a competitive market would pay.",
        },
      ],
      sources: [
        SOURCES.dolMinimumWage,
        SOURCES.blsData,
        SOURCES.cboReports,
        SOURCES.nberPapers,
        SOURCES.urban,
        SOURCES.aei,
      ],
    },
    argumentBank: {
      support: {
        opening: [
          "A full-time job at $7.25 an hour comes to roughly $15,000 a year before tax. That is the legal floor for someone working every week of the year, and it has not moved since 2009 while everything they buy has. I do not think the question is whether that is enough to live on — nobody argues it is. The question is whether Congress letting inflation quietly cut the real floor every year is a defensible way to make policy.",
          "The strongest thing that has changed in this debate is the evidence. The classic prediction was that raising the floor destroys jobs at the bottom. A large body of work studying actual state and city increases has found employment effects close to zero across the ranges studied. That does not mean any increase is safe at any level, but it does mean the confident textbook claim is not what the data shows.",
        ],
        rebuttal: [
          "You argued that a single national floor lands differently in a high-cost city than a rural county, and that is genuinely the best objection here. My answer is that it is an argument about the number and the phase-in, not about whether to act. Index it, phase it over several years, and the rural employer faces a predictable schedule instead of a cliff. What is not defensible is holding the floor at a figure set in 2009 because designing a better one is hard.",
          "On the CBO estimates: you are right that they show a trade-off, and I am not going to pretend they show only benefits. But read what they actually project — a large number of workers with higher earnings, a smaller number with reduced employment, and a net reduction in the number of people below the poverty line. You are entitled to weigh that trade-off differently than I do. You are not entitled to describe it as a policy that mainly hurts the people it targets.",
        ],
        counter: [
          "You prefer the Earned Income Tax Credit, and I will concede it is a well-designed policy that does real good. But notice who pays under each approach. The tax credit means taxpayers subsidise employers who pay below a living wage; a wage floor means the employer pays it. Those are different distributional choices, and 'use the tax credit instead' quietly picks one without arguing for it.",
        ],
        closing: [
          "Two things are true at once: raising the floor helps most low-wage workers, and at some level it costs some of them hours. Every serious economist accepts both. The dishonest move is to pretend either half does not exist. I am arguing that at the current level — a wage frozen for over fifteen years, worth far less than when it was set — we are nowhere near the point where the second effect outweighs the first.",
        ],
      },
      oppose: {
        opening: [
          "The United States is not one labour market. A wage that is modest in a coastal city can sit above what most jobs pay in a rural county, and that is where a federal floor actually binds. Nationally averaged studies wash this out, because the increases they study happened in places where the new floor was still below the local market wage. That tells you very little about what happens where it is not.",
          "I want to state the trade-off honestly rather than deny it. Raising the floor raises pay for workers who keep their hours. The Congressional Budget Office has consistently projected that a large increase does that and reduces employment for some workers. My objection is not that the policy has no benefits. It is that its costs land on exactly the workers with the least bargaining power, and they are the least visible people in this debate.",
        ],
        rebuttal: [
          "You cited the research finding employment effects near zero, and it is real research that I take seriously. But look at what it can and cannot see. Employers respond by cutting scheduled hours, delaying a new location, or automating a task, and none of those register as a layoff in the data these studies use. Finding no change in headcount is not the same as finding no effect, and the studies themselves usually say so.",
          "You argued that inaction is itself a slow cut, and I think that is your best point. I will grant it: a floor that erodes with inflation is a policy nobody actually voted for. That is an argument for indexing, which I could support. It is not an argument for the size of increase on the table, and I notice those two proposals get bundled together precisely because indexing is the easier sell.",
        ],
        counter: [
          "On who pays: you framed the tax credit as taxpayers subsidising employers. Turn it around. A wage floor is a tax on hiring the least experienced workers, collected from the employers most likely to hire them, and paid in the form of jobs that do not get created. The credit targets household income directly without touching the cost of a first job. If the goal is the worker's living standard rather than a symbolic figure, that is the better instrument.",
        ],
        closing: [
          "I am not defending $7.25. I have said I could support indexing, and I think a moderate increase with a long phase-in is defensible. What I am resisting is the framing that this is a costless policy with only bad-faith opposition. It has real trade-offs, they fall on people at the very start of their working lives, and a debate that will not name them is not an honest one.",
        ],
      },
    },
  },

  /* ======================================================================
     5 — Defense spending
     ====================================================================== */
  {
    id: "dbt-defense-spending",
    slug: "defense-spending",
    title: "Should the U.S. increase defense spending?",
    description:
      "The largest discretionary line in the federal budget. What it buys, and what it crowds out, are separate questions.",
    category: "Foreign Policy",
    difficulty: "Advanced",
    format: "standard",
    status: "ongoing",
    featured: false,
    tags: ["Defense", "Federal budget", "Alliances"],
    estimatedMinutes: 20,
    participants: 604,
    averageScore: 80,
    hoursRemaining: 87,
    sentiment: { support: 39, oppose: 44, undecided: 17 },
    relatedIssueSlug: "foreign-policy-and-defense",
    brief: {
      question:
        "Should the United States increase its annual defense budget above current levels?",
      sixtySecond: [
        "Defense is the largest single item in the federal discretionary budget — the portion Congress sets each year, as distinct from mandatory programmes like Social Security and Medicare.",
        "The budget is set annually through an authorisation bill, which says what the military may do and buy, and an appropriations bill, which provides the money. They are separate votes.",
        "The disagreement is rarely about whether to have a military. It is about how much capability the current strategy requires, whether the money already appropriated is spent well, and what else that money could do.",
      ],
      supporterArguments: [
        "Supporters argue that deterrence is cheaper than war, and that a visible capability gap invites exactly the conflicts that would cost far more to fight.",
        "Treaty commitments have to be backed by real capacity. Supporters argue that alliance guarantees the U.S. cannot physically honour are worse than no guarantees at all.",
        "Shipbuilding, munitions production and the industrial base take years to expand. Supporters argue that capacity has to be funded before it is needed, not after.",
        "Recruitment, retention and readiness depend on pay and maintenance budgets, which supporters argue have been squeezed by the cost of new systems.",
      ],
      opponentArguments: [
        "The Department of Defense has repeatedly failed comprehensive audits. Opponents argue that adding money to a system that cannot fully account for what it has is not a serious response to a capability problem.",
        "Government Accountability Office reviews consistently find major acquisition programmes over cost and behind schedule. Opponents argue the binding constraint is procurement reform, not budget size.",
        "Every dollar is a choice. Opponents argue that spending is a strategic statement, and that some capabilities being funded reflect institutional momentum rather than current threats.",
        "Opponents also argue that a larger standing capability lowers the political cost of using force, making intervention more likely rather than less.",
      ],
      democraticView:
        "Democratic positions vary widely, but the more common argument among Democratic lawmakers is that increases should be tied to specific readiness needs and paired with acquisition reform and audit compliance.",
      republicanView:
        "Most Republican lawmakers support higher defense budgets, generally arguing that the strategic environment demands greater capacity and that deterrence failure would be far more expensive.",
      democraticDisagreement:
        "Democrats split sharply. Many from districts with shipyards, bases or defense manufacturing back large increases; others argue for substantial cuts. There is no single Democratic position.",
      republicanDisagreement:
        "Republicans are also divided. Fiscal conservatives and non-interventionists have joined Democrats in voting against increases, arguing that the Pentagon should not be exempt from spending discipline.",
      otherPerspectives: [
        "Some defense analysts argue the level is the wrong variable entirely — that the same budget allocated toward munitions stockpiles and logistics rather than large platforms would buy substantially more deterrence.",
      ],
      keyFacts: [
        "Defense is the largest single component of federal discretionary spending.",
        "Congress passes a separate authorisation bill and appropriations bill each year; authorisation alone does not provide money.",
        "The Department of Defense has not passed a full financial audit since department-wide audits began.",
        "The Government Accountability Office publishes annual assessments of major weapons acquisition programmes, including cost and schedule performance.",
        "Personnel, operations and maintenance make up a large share of the budget, separate from procurement of new systems.",
      ],
      statistics: [
        { value: "Largest", label: "Defense's rank within federal discretionary spending", sourceId: "dod-budget" },
        { value: "Annual", label: "Frequency of GAO weapons programme assessments", sourceId: "gao-reports" },
      ],
      keyTerms: [
        {
          term: "Discretionary spending",
          definition:
            "Federal spending Congress sets each year through appropriations, as opposed to mandatory spending set by existing law.",
        },
        {
          term: "Authorisation vs appropriation",
          definition:
            "Authorisation says what a programme may do; appropriation provides the money. Both are required.",
        },
        {
          term: "Readiness",
          definition:
            "Whether forces are trained, staffed, equipped and maintained well enough to carry out assigned missions now.",
        },
        {
          term: "Deterrence",
          definition:
            "Preventing an action by making its expected cost to the other side exceed its expected gain.",
        },
      ],
      sources: [
        SOURCES.defenseBudget,
        SOURCES.gaoReports,
        SOURCES.cboReports,
        SOURCES.stateDept,
        SOURCES.brookings,
        SOURCES.cato,
      ],
    },
    argumentBank: {
      support: {
        opening: [
          "Deterrence is the cheapest defense policy available, and it only works if it is credible. A capability gap is not a saving — it is a bet that nobody tests it. Every conflict the United States has been drawn into cost vastly more than the deterrent posture that might have prevented it, and the industrial capacity to build ships, munitions and aircraft takes the better part of a decade to expand. You cannot buy it in the year you discover you need it.",
          "Start with the least glamorous part of the budget: pay, maintenance and training. Readiness rates have been squeezed because the cost of new systems has grown faster than the top line, and the money comes out of the accounts that keep existing equipment working and existing people serving. Even someone who wants no new platforms at all should want the maintenance budget funded, and right now it competes with everything else inside a flat number.",
        ],
        rebuttal: [
          "You argued that the Pentagon cannot pass an audit, so it should not get more money. I accept the premise completely — the audit failures are real and indefensible. But the conclusion does not follow. Accounting systems are broken because they are dozens of incompatible legacy systems, and fixing that costs money too. 'No new funding until the books are clean' is a policy that guarantees the books stay dirty while the readiness bill comes due anyway.",
          "On acquisition overruns: the GAO findings are accurate and I will not defend the cost growth on major programmes. What I will say is that you have identified a reason to change how money is spent, not a reason to spend less. If the F-35 costs too much, the answer is reforming the acquisition process, not leaving a fighter gap. Those are different arguments and the second does not follow from the first.",
        ],
        counter: [
          "Your strongest point is the moral hazard one — that a larger standing capability lowers the political cost of using force. I take it seriously, and the historical record gives it some support. But the constraint on using force is constitutional and political, not budgetary. If we want fewer interventions, the honest lever is war powers reform, not underfunding maintenance and hoping that scarcity substitutes for judgment.",
        ],
        closing: [
          "I am not arguing that every dollar in this budget is well spent. Plenty of it is not, and the GAO says so every year. I am arguing that the level and the efficiency are separate questions, and that treating them as one lets us avoid both. Fix procurement, pass the audit, and fund readiness — those are complements, not alternatives.",
        ],
      },
      oppose: {
        opening: [
          "The Department of Defense has never passed a full financial audit. Not once. It cannot fully account for the assets it already holds, and the Government Accountability Office finds year after year that its largest acquisition programmes run over cost and behind schedule. In any other context we would call adding money to that system before fixing it a failure of oversight. The constraint here is not the size of the budget. It is what happens to money once it enters it.",
          "Every budget is a strategy document whether we treat it as one or not. When a large share goes to platforms designed for a previous era's conflicts while munitions stockpiles run thin, that is not a considered strategic choice — that is institutional momentum and the political economy of where things get built. I would rather have that argument openly than settle it by raising the top line and letting the existing allocation carry forward.",
        ],
        rebuttal: [
          "You argued that deterrence is cheaper than war, and I agree with that entirely. The question you skipped is whether the marginal dollar buys deterrence. Analysts across the political spectrum have argued the same budget weighted toward munitions, logistics and sustainment would buy substantially more of it than the current allocation. So 'deterrence is cheap' is an argument for spending well, and you have used it as an argument for spending more.",
          "On readiness: this is your best point and I want to concede it cleanly. Maintenance and personnel accounts have genuinely been squeezed, and that is a real problem with real consequences. But notice that it is a problem of internal allocation. If readiness is what we care about, fund readiness — do not raise the whole number and hope that the share reaching maintenance goes up, when the historical pattern is that it does not.",
        ],
        counter: [
          "You said audit reform costs money too, and that is fair. Then appropriate it specifically, with a deadline attached. What I am objecting to is the pattern where the audit failure is acknowledged in a hearing every year, the top line rises anyway, and nothing changes. Conditioning increases on measurable financial management progress is the ordinary way Congress handles this for every other agency.",
        ],
        closing: [
          "I am not arguing for a smaller military as an end in itself. I am arguing that an institution that cannot account for what it owns, whose largest programmes routinely run over cost, has not earned the presumption that more money produces more security. Pass the audit. Reform acquisition. Rebalance toward what actually deters. Then let us talk about the top line.",
        ],
      },
    },
  },

  /* ======================================================================
     6 — AI regulation
     ====================================================================== */
  {
    id: "dbt-ai-regulation",
    slug: "ai-regulation",
    title: "Should the federal government regulate AI development?",
    description:
      "A technology moving faster than the institutions that would govern it. Who decides what counts as safe enough?",
    category: "Technology",
    difficulty: "Advanced",
    format: "standard",
    status: "live",
    featured: false,
    tags: ["AI", "Regulation", "Innovation policy"],
    estimatedMinutes: 19,
    participants: 1467,
    averageScore: 77,
    hoursRemaining: 14,
    sentiment: { support: 53, oppose: 33, undecided: 14 },
    relatedArticleSlug: "congress-and-ai-rules",
    relatedIssueSlug: "technology-and-speech",
    brief: {
      question:
        "Should the federal government impose binding safety and transparency requirements on the development of advanced AI systems?",
      sixtySecond: [
        "There is currently no comprehensive federal statute governing the development of advanced AI systems. Existing law applies where AI touches an already-regulated area — hiring, lending, medical devices — but not to development itself.",
        "The National Institute of Standards and Technology has published a voluntary AI Risk Management Framework. It is guidance, not a binding rule.",
        "Proposals range from mandatory pre-deployment testing and disclosure for the largest systems, to sector-specific rules, to relying on existing consumer protection and liability law.",
      ],
      supporterArguments: [
        "Supporters argue that safety-critical industries — aviation, pharmaceuticals, nuclear power — are all regulated before deployment rather than after harm, and that the same logic applies here.",
        "Without disclosure requirements, no outside party can verify a developer's safety claims. Supporters argue that transparency is a precondition for any accountability at all.",
        "A patchwork of conflicting state laws is the alternative to a federal standard. Supporters argue that a single federal rule is more workable for companies than fifty different ones.",
        "Supporters argue that the firms building these systems have said publicly that regulation is warranted, which weakens the claim that any rule would be industry-destroying.",
      ],
      opponentArguments: [
        "Opponents argue that regulators cannot write good rules for a technology whose capabilities change faster than the rulemaking process, and that premature rules lock in today's approaches.",
        "Compliance costs fall hardest on small developers and open-source projects. Opponents argue that heavy requirements entrench the largest incumbents under the banner of safety.",
        "Much AI harm is already illegal under existing law — discrimination, fraud, defamation, product liability. Opponents argue the gap is enforcement, not statutory authority.",
        "Opponents also raise a competitiveness argument: development that is restricted domestically may relocate rather than stop.",
      ],
      democraticView:
        "Democratic proposals more often emphasise algorithmic accountability, civil rights impacts, disclosure requirements and worker displacement, and are generally more open to a new regulatory body.",
      republicanView:
        "Republican proposals more often emphasise avoiding rules that would slow domestic development, preferring existing agencies and sector-specific enforcement to a new AI regulator.",
      democraticDisagreement:
        "Democrats disagree about scope. Some focus on present-day harms — bias in hiring and lending — and view catastrophic-risk framing as a distraction; others treat frontier model oversight as the priority.",
      republicanDisagreement:
        "Republicans disagree too. Some have co-sponsored transparency requirements for frontier systems, particularly on national security grounds, while others oppose any new federal authority.",
      otherPerspectives: [
        "Many computer scientists argue the regulatory unit is wrong: rules should attach to deployment in a specific context, since the same model can be harmless in one setting and dangerous in another.",
        "Open-source advocates argue that disclosure and openness are themselves a safety mechanism, and that rules written around closed models could make the ecosystem less inspectable.",
      ],
      keyFacts: [
        "No comprehensive federal statute currently governs the development of advanced AI systems in the United States.",
        "NIST's AI Risk Management Framework is voluntary guidance rather than an enforceable regulation.",
        "Existing law already applies to AI used in regulated contexts such as employment, credit and medical devices.",
        "Several states have enacted their own AI-related laws, creating differing requirements across jurisdictions.",
        "The Federal Trade Commission has brought enforcement actions involving AI products under existing consumer protection authority.",
      ],
      statistics: [
        { value: "Voluntary", label: "Legal status of the NIST AI Risk Management Framework", sourceId: "nist-ai-rmf" },
        { value: "None", label: "Comprehensive federal AI development statutes in force", sourceId: "congress-legislation" },
      ],
      keyTerms: [
        {
          term: "Frontier model",
          definition:
            "A general-purpose AI system at or near the leading edge of capability, usually defined by training compute or evaluated capability.",
        },
        {
          term: "Pre-deployment testing",
          definition:
            "Evaluating a system for specified risks before it is released, rather than responding to harms afterward.",
        },
        {
          term: "Regulatory capture",
          definition:
            "When the industry a regulator oversees comes to shape the rules in its own favour.",
        },
        {
          term: "Open weights",
          definition:
            "Releasing a model's trained parameters publicly, so anyone can run, inspect or modify it.",
        },
      ],
      sources: [
        SOURCES.nistAIFramework,
        SOURCES.ftcConsumerProtection,
        SOURCES.congressLegislation,
        SOURCES.brookings,
        SOURCES.cato,
        SOURCES.reuters,
      ],
    },
    argumentBank: {
      support: {
        opening: [
          "We do not let a pharmaceutical company decide for itself whether a drug is safe enough to sell, or an aircraft manufacturer certify its own airframe. In every domain where failure is severe and the developer knows far more than the public, we require testing before deployment and disclosure that outsiders can check. AI development is the one frontier technology where we have decided the developer's own assurance is sufficient, and I have not heard a principled reason for the exception.",
          "The practical case is simpler than the philosophical one. Right now nobody outside a developer can verify any safety claim it makes, because the evaluations, the training data and the results are all internal. Transparency is not the whole answer, but it is the precondition for every other answer. Without it, 'we tested it and it is fine' is not a claim that can be checked, only believed.",
        ],
        rebuttal: [
          "You argued that regulators cannot keep pace with a technology that changes this fast. That is a real problem and it argues for a particular kind of rule, not against rules. Performance-based requirements — disclose what you tested, report what you found, meet an outcome standard — do not encode any specific technique and do not go stale when the architecture changes. The rules that age badly are the ones that specify methods, and nobody serious is proposing those.",
          "Your point about compliance costs falling hardest on small developers and open-source projects is the strongest objection here, and I will not wave it away. The answer is thresholds. Every serious proposal scopes obligations by training compute or capability precisely so a research group or a startup is not swept in. If a rule would burden a two-person team, that is a drafting failure worth fixing, not a reason to leave the largest systems unexamined.",
        ],
        counter: [
          "On enforcement of existing law: you are right that discrimination and fraud are already illegal, and I agree enforcement has lagged. But existing law is triggered by a harm that has already happened to an identifiable person. That works for a discriminatory lending decision. It does not work for a risk that materialises at scale and cannot be unwound. Ex post liability is the wrong instrument for that class of harm, which is exactly why we use ex ante rules in aviation and nuclear power.",
        ],
        closing: [
          "The choice is not between regulation and no regulation. It is between one federal standard and fifty state ones, and between rules written deliberately now and rules written reactively after something goes badly wrong. I would rather have the deliberate version. Scope it by capability, make it about disclosure and testing rather than technique, and let it be revised as the technology moves.",
        ],
      },
      oppose: {
        opening: [
          "Consider what a rule written today would actually encode. Regulators would have to define a frontier system, specify what testing counts, and set a threshold — and every one of those choices freezes a snapshot of a technology that looks materially different every eighteen months. The likely outcome is not safety; it is a compliance regime built around the approaches that happen to be dominant right now, which the largest firms are best placed to satisfy and small developers are not.",
          "Look at who is asking for this. The firms with the largest compliance departments have publicly supported regulation, and that is not because they expect it to constrain them. A pre-deployment approval regime is a fixed cost, and fixed costs are a competitive advantage for whoever is largest. The most predictable effect of the rules on the table is fewer competitors, not fewer harms.",
        ],
        rebuttal: [
          "You compared AI to pharmaceuticals and aviation. Notice what makes those regimes workable: a bounded product, a defined use, and a measurable endpoint. A drug treats a condition and you can run a trial. A general-purpose model has no defined use — the same system writes code, drafts emails and answers medical questions, and it is safe in one context and not in another. You cannot certify safety for a system whose uses are unbounded. That is why the regulatory unit should be deployment in a context, not development.",
          "On transparency being a precondition for accountability: I agree, more than you might expect. Disclosure requirements are the part of your case I find most defensible, and I would support targeted ones. But notice you have argued for disclosure and I have been asked to defend against a licensing regime. If the proposal were transparency alone, this would be a much shorter debate.",
        ],
        counter: [
          "Your ex ante versus ex post distinction is the sharpest thing you have said. But apply it honestly: it justifies pre-deployment rules for specific catastrophic risk categories, narrowly defined. It does not justify a general development licence. And the categories where the argument works — biological and cyber capability — are already the subject of existing national security authorities that do not require a new agency.",
        ],
        closing: [
          "I am not arguing that AI is harmless or that developers should be trusted on their word. I am arguing that the instrument matters. Enforce existing law properly, require disclosure where verification is possible, regulate deployment in the contexts where harm is concrete. What I am resisting is a development licence that will be written by the people best resourced to shape it, aimed at a technology it cannot accurately describe.",
        ],
      },
    },
  },

  /* ======================================================================
     7 — Standardised testing
     ====================================================================== */
  {
    id: "dbt-standardized-testing",
    slug: "standardized-testing",
    title: "Should colleges require standardized tests for admission?",
    description:
      "A single number that opens doors for some students and closes them for others. Which effect dominates is genuinely contested.",
    category: "Education",
    difficulty: "Introductory",
    format: "quick",
    status: "live",
    featured: false,
    tags: ["Admissions", "Testing", "Access"],
    estimatedMinutes: 7,
    participants: 1891,
    averageScore: 74,
    hoursRemaining: 5,
    sentiment: { support: 41, oppose: 46, undecided: 13 },
    relatedIssueSlug: "education-policy",
    brief: {
      question:
        "Should colleges and universities require standardized test scores as part of undergraduate admissions?",
      sixtySecond: [
        "Many institutions suspended test requirements and adopted test-optional policies. Some have since reinstated requirements, citing their own internal research.",
        "Both sides of this argument point to real data about the same tests. They disagree about what the data means and which comparison is the right one.",
        "The underlying question is what a test score measures: preparation and opportunity, academic readiness, or some mixture that varies by student.",
      ],
      supporterArguments: [
        "Supporters argue that a common measure is the only element of an application that means the same thing across every high school, where grading standards vary enormously.",
        "Several universities that reinstated requirements published analyses finding scores predicted college performance, and that dropping them had made it harder to identify promising students from under-resourced schools.",
        "Without a common measure, supporters argue weight shifts to essays, activities and recommendations — components that advantage families who can pay for coaching.",
        "Supporters argue that a score can also serve as a signal of readiness that prompts support before a student struggles, not just a gate.",
      ],
      opponentArguments: [
        "Opponents argue scores track family income and access to preparation closely enough that the test measures opportunity as much as readiness.",
        "Test-optional institutions frequently reported more diverse applicant pools, which opponents read as evidence the requirement was deterring qualified students from applying.",
        "Opponents argue that high school grades over four years predict college performance at least as well as a single test administration, and reflect sustained work.",
        "The preparation industry is expensive and unevenly available. Opponents argue that a measure with a paid improvement path is not a level comparison.",
      ],
      democraticView:
        "Democratic education policymakers have more often supported test-optional approaches, generally framing the requirement as an access barrier, though the position is not uniform.",
      republicanView:
        "Republican education policymakers have more often supported keeping requirements, generally framing common measures as objective and merit-based.",
      democraticDisagreement:
        "Democrats are genuinely split. Some prominent progressive education researchers argue that removing tests hurts high-achieving low-income students most, because a strong score is often the clearest signal available to a student from an unknown school.",
      republicanDisagreement:
        "Republicans differ too, with some arguing that admissions criteria are properly a decision for individual institutions rather than a matter for public policy at all.",
      otherPerspectives: [
        "Some admissions researchers argue the real variable is how scores are used: as a threshold, they exclude; read in the context of a student's school and circumstances, they can identify students a transcript alone would miss.",
      ],
      keyFacts: [
        "Test-optional policies mean an applicant chooses whether to submit scores; test-blind policies mean scores are not considered at all.",
        "Some universities reinstated testing requirements after internal analyses of their own admitted students.",
        "The National Center for Education Statistics publishes data on admissions criteria and enrolment.",
        "High school grade point averages are not standardised across schools, districts or states.",
        "Commercial test preparation is widely available at a range of prices, and access to it varies by family income.",
      ],
      statistics: [
        { value: "Varies", label: "Grading standards across U.S. high schools", sourceId: "nces" },
        { value: "Optional vs blind", label: "Two distinct policy approaches", sourceId: "ed-gov" },
      ],
      keyTerms: [
        {
          term: "Test-optional",
          definition: "A policy letting applicants decide whether to submit standardized test scores.",
        },
        {
          term: "Test-blind",
          definition: "A policy under which scores are not considered even if submitted.",
        },
        {
          term: "Predictive validity",
          definition:
            "How well a measure forecasts a later outcome, such as first-year college grades.",
        },
        {
          term: "Holistic review",
          definition:
            "Evaluating an application across many factors rather than by a formula on grades and scores.",
        },
      ],
      sources: [SOURCES.nces, SOURCES.edGov, SOURCES.brookings, SOURCES.urban, SOURCES.pewResearch],
    },
    argumentBank: {
      support: {
        opening: [
          "An A at one high school and an A at another are not the same thing, and everyone in admissions knows it. Grading standards vary enormously between schools, districts and states, and a transcript from a school an admissions officer has never heard of is close to uninterpretable on its own. A common measure is the only element of an application that means the same thing everywhere. Remove it and you have not removed the inequality — you have removed the one instrument that can see across it.",
          "Ask what fills the gap. When scores come out, weight shifts to essays, recommendations and extracurricular activities. Every one of those is more responsive to money than a test score is. A family that can hire an essay coach, fund a summer programme and place a student in an unpaid internship gains far more from a testless process than from a tested one. The reform sounds like it removes an advantage; in practice it relocates it somewhere harder to see.",
        ],
        rebuttal: [
          "You argued that scores correlate with family income. They do, and I am not going to dispute the correlation. But grades correlate with family income too, and so do extracurriculars, essays and recommendations — in several analyses, more strongly. Correlation with income is a property of nearly every admissions input, because it is a property of American schooling. If that is your standard, it eliminates the whole application, and you have to tell me what replaces it.",
          "On test-optional institutions reporting more diverse applicant pools: that is real, and it is the best evidence you have. But look at what it measures — who applied, not who was admitted or who succeeded. Several universities that examined their own admitted students found the opposite of what they expected, which is why some reinstated the requirement. An applicant-pool statistic and an outcome statistic are different claims.",
        ],
        counter: [
          "I will concede the coaching industry point without reservation: a measure with a paid improvement path is not a clean comparison, and that is a genuine defect. The response is to change how the score is read, not whether it exists. Read in the context of a student's school, a strong score from an under-resourced high school is the clearest signal an admissions officer will ever get. Used as a raw threshold, it excludes. The defect is in the use.",
        ],
        closing: [
          "Both sides here are arguing about access, and I want that on the record. My claim is narrow: for a student at a school nobody in admissions has heard of, with no counselor, no coach and no network, a score is often the only portable evidence they have. Removing it does not help that student. It removes the one thing that made them legible.",
        ],
      },
      oppose: {
        opening: [
          "A single Saturday morning cannot tell you what four years of a student's work can. Grades across four years reflect sustained effort, recovery from a bad term, and how someone performs when it matters repeatedly rather than once. The research on predictive validity consistently finds that high school grades predict college performance at least as well as test scores, and often better. Given that, the burden is on the requirement to justify itself, and 'grades vary between schools' is a reason to contextualise grades, not to add a measure that varies by income.",
          "Follow the money through this system. Preparation is a commercial industry, it demonstrably raises scores, and access to it is distributed by what a family can pay. That means the score is partly a measure of readiness and partly a measure of purchased preparation, and nobody can tell you the ratio for any individual student. A measure with a paid improvement path built into it is not a common yardstick. It is a yardstick that stretches for people who can afford it.",
        ],
        rebuttal: [
          "You argued that removing tests shifts weight to essays and activities, which are even more responsive to money. That is a serious point and I think it is partly right. But it is an argument against holistic review as currently practiced, not for the test. I would go further than you: reduce the weight on activities and polished essays too, and put it on the transcript read in the context of the school. That answers your objection without reintroducing the paid measure.",
          "On the universities that reinstated requirements: their analyses are real and I take them seriously. What I would ask you to notice is what they actually found — that scores had predictive value within their admitted population, which is a group already filtered by every other criterion. That tells you the score carries information at the margin. It does not tell you the requirement did not deter qualified applicants from applying at all, which is the harm I am pointing at.",
        ],
        counter: [
          "You said a strong score from an under-resourced school is the clearest signal an admissions officer can get. I agree — and notice that is an argument for test-optional, not for a requirement. Under test-optional, exactly that student submits their score and it does exactly that work. What test-optional removes is the case where an equally capable student who could not afford preparation is filtered out before anyone reads their file.",
        ],
        closing: [
          "The question is not whether a score contains information. It does. The question is whether requiring it from everyone does more good than the students it deters and the preparation gap it rewards. Let students who are served by their score submit it. Read transcripts in the context of the school. That captures the signal you care about without making a purchasable number the price of applying.",
        ],
      },
    },
  },

  /* ======================================================================
     8 — Carbon pricing
     ====================================================================== */
  {
    id: "dbt-carbon-pricing",
    slug: "carbon-pricing",
    title: "Should the U.S. put a price on carbon emissions?",
    description:
      "Economists across the spectrum have long favoured it. It has repeatedly failed to pass. Both facts need explaining.",
    category: "Environment",
    difficulty: "Intermediate",
    format: "standard",
    status: "upcoming",
    featured: false,
    tags: ["Climate", "Taxation", "Energy"],
    estimatedMinutes: 17,
    participants: 512,
    averageScore: 82,
    hoursRemaining: 130,
    sentiment: { support: 47, oppose: 38, undecided: 15 },
    relatedIssueSlug: "climate-and-energy",
    brief: {
      question:
        "Should the United States adopt a national price on carbon emissions, through a tax or a cap-and-trade system?",
      sixtySecond: [
        "A carbon price makes emitting carbon dioxide cost money. The two main designs are a tax, which sets the price and lets the quantity adjust, and cap-and-trade, which sets the quantity and lets the price adjust.",
        "The economic argument is that emissions are an unpriced cost imposed on others, and pricing them makes every decision in the economy account for it without government picking technologies.",
        "The United States has no national carbon price. Some states operate regional programmes, and current federal climate policy relies mainly on subsidies and regulation instead.",
      ],
      supporterArguments: [
        "Supporters argue a price harnesses the whole economy's decision-making at once, rather than requiring regulators to identify the cheapest reduction in every sector.",
        "It is technology-neutral. Supporters argue this avoids government betting on particular solutions and lets approaches nobody has thought of compete on cost.",
        "Revenue can be returned to households as a dividend. Supporters argue that under most designs, lower-income households come out ahead because they emit less in absolute terms.",
        "Supporters argue a predictable, rising price gives businesses the planning certainty that shifting regulations and expiring subsidies do not.",
      ],
      opponentArguments: [
        "Energy costs are a larger share of spending for lower-income households. Opponents argue a price is regressive before rebates, and rebate design is politically fragile.",
        "Carbon-intensive production can relocate to countries without a price. Opponents argue this moves emissions rather than reducing them, and costs domestic jobs.",
        "Opponents argue the price required to hit stated targets is far higher than has ever proved politically durable, and that a price too low to work is worse than nothing because it substitutes for real policy.",
        "Some opponents argue direct investment in clean technology has produced faster cost declines than any price signal did, so the money is better spent building things.",
      ],
      democraticView:
        "Democratic climate policy has largely moved toward subsidies, tax credits and direct investment rather than pricing, though some Democratic economists continue to argue pricing is the more efficient instrument.",
      republicanView:
        "Most Republican lawmakers oppose a carbon tax, generally arguing it raises energy costs and functions as a broad-based tax increase.",
      democraticDisagreement:
        "Democrats disagree substantially. Environmental justice organisations have opposed cap-and-trade specifically, arguing that trading permits allows pollution to concentrate in particular communities even as national totals fall.",
      republicanDisagreement:
        "A group of Republican economists and former officials has publicly advocated a carbon tax with dividends, arguing it is the market-based alternative to regulation. It remains a minority position within the party.",
      otherPerspectives: [
        "Some analysts argue the design question matters more than the yes-or-no question: a border adjustment addresses relocation, and a dividend addresses regressivity, so a poorly designed price should not be used to reject the concept.",
      ],
      keyFacts: [
        "A carbon tax sets a price and lets emissions quantity adjust; cap-and-trade sets a quantity and lets the price adjust.",
        "The United States has no national carbon price; some states participate in regional programmes.",
        "The Environmental Protection Agency publishes annual national greenhouse gas emissions data by sector.",
        "A border carbon adjustment charges imports based on their embedded emissions, and is the standard proposal for addressing relocation.",
        "Current federal climate policy relies primarily on tax credits, direct spending and regulation rather than a price.",
      ],
      statistics: [
        { value: "0", label: "National carbon prices currently in force in the U.S.", sourceId: "epa-ghg" },
        { value: "Annual", label: "Frequency of EPA greenhouse gas inventory publication", sourceId: "epa-ghg" },
      ],
      keyTerms: [
        {
          term: "Externality",
          definition:
            "A cost or benefit of an activity that falls on someone who was not part of the decision.",
        },
        {
          term: "Cap-and-trade",
          definition:
            "A system setting a total emissions limit and issuing tradable permits within it.",
        },
        {
          term: "Carbon dividend",
          definition:
            "Returning carbon price revenue directly to households, usually as an equal per-person payment.",
        },
        {
          term: "Border carbon adjustment",
          definition:
            "A charge on imports reflecting their embedded emissions, intended to stop production simply relocating.",
        },
      ],
      sources: [
        SOURCES.epaEmissions,
        SOURCES.eiaEnergy,
        SOURCES.cboReports,
        SOURCES.nberPapers,
        SOURCES.aei,
        SOURCES.brookings,
      ],
    },
    argumentBank: {
      support: {
        opening: [
          "Right now, putting carbon dioxide into the atmosphere is free to the person doing it and costly to everyone else. That is the textbook definition of an unpriced externality, and the textbook answer is to price it. What makes this instrument different from every alternative is that it does not require anyone in government to know which reduction is cheapest. A steel plant, a utility and a household each know their own options better than a regulator does, and a price makes all of them account for the cost at once.",
          "Compare it honestly to what we do instead. Subsidies and regulations require the government to pick which technologies to back, and they expire, get repealed, and shift with each administration. A rising, predictable carbon price gives a company deciding on a twenty-year capital investment something to plan against. And because a dividend design returns the revenue per person, most lower-income households come out ahead — they emit less in absolute terms than higher-income households do.",
        ],
        rebuttal: [
          "You argued a carbon price is regressive. Before rebates, that is correct and I will not dispute it. But almost every serious proposal returns revenue as an equal per-person dividend, and under that design the analyses consistently find the majority of lower-income households receive more than they pay, because the wealthiest households emit several times more. You have identified a property of one design and used it against a policy that has a well-known fix.",
          "On leakage: it is a real effect and a real concern. It is also a solved design problem. A border carbon adjustment charges imports for their embedded emissions, which removes the advantage of relocating and is in nearly every serious proposal precisely because everybody anticipated your objection. Arguing against a carbon price without a border adjustment is arguing against a version nobody is proposing.",
        ],
        counter: [
          "Your strongest point is the political durability one — that the price needed to hit stated targets is higher than has ever survived, and a price too low to work is worse than nothing because it crowds out real policy. I take that seriously. But notice it is a prediction about politics, not a claim about the instrument. And a low price is not nothing: it changes marginal decisions at the margin, and it establishes the mechanism that can be raised later.",
        ],
        closing: [
          "Economists across the political spectrum agree on this instrument to a degree they agree on almost nothing else, and it keeps failing to pass. Both facts are true. But the reason it fails is that its cost is visible and its benefit is diffuse, which is a fact about how legislatures work, not evidence that the policy is wrong. The alternative we chose instead — subsidies and regulation — makes the cost invisible by burying it, and it is not obviously cheaper.",
        ],
      },
      oppose: {
        opening: [
          "The theory here is clean and I am not going to pretend otherwise: pricing an externality is textbook, and the economics is sound. My objection is about what actually happens. Energy is a much larger share of spending for households at the bottom, and it is not optional — you cannot decide to stop heating in January. Supporters answer with a dividend, and dividends are exactly the part of a policy that gets traded away in conference, delayed, or repealed by a later Congress while the price stays. The regressive part is durable; the fix is not.",
          "Look at what has actually driven emissions down. The largest cost declines in solar, wind and batteries came from direct investment, procurement and deployment at scale — from building things — not from a price signal. Carbon prices that have been implemented have generally been set well below the level their own advocates say is needed. So the empirical record is that the instrument economists prefer has underperformed the instrument they are less enthusiastic about.",
        ],
        rebuttal: [
          "You said a dividend fixes regressivity, and in the model it does. Now tell me the political story. The price is a permanent statutory change; the dividend is an appropriation that a future Congress adjusts. I am not raising a hypothetical — this is the standard life cycle of a paired tax-and-transfer. Designing a policy whose fairness depends on the durability of its most politically vulnerable component is not a small caveat.",
          "On border adjustments: I will grant they address leakage in principle, and I think it is your best answer. In practice they require measuring embedded emissions in every imported good from every trading partner, which no country has yet done at scale, and they raise trade law questions that would take years to resolve. 'There is a design that solves this' is doing a lot of work when that design has never been implemented anywhere.",
        ],
        counter: [
          "You called durability a fact about legislatures rather than about the instrument. I think that distinction lets the policy off too easily. A policy that cannot survive contact with the political system it must pass through is not a good policy, however elegant the model. Designing for the world we have is part of the job, not an excuse.",
        ],
        closing: [
          "I want the same outcome you do. I am arguing about instruments. Spend directly on the technologies that have shown the steepest cost declines, regulate the highest-emitting sectors where the reductions are concentrated, and build the transmission capacity that is currently the binding constraint. Those survive elections. A price whose fairness depends on a dividend that a later Congress can quietly drop does not.",
        ],
      },
    },
  },
];

/* ==========================================================================
   Lookups
   ========================================================================== */

export const DEBATE_BY_SLUG = new Map(DEBATES.map((d) => [d.slug, d]));

export function getDebate(slug: string): Debate | undefined {
  return DEBATE_BY_SLUG.get(slug);
}

export function featuredDebate(): Debate {
  return DEBATES.find((d) => d.featured) ?? DEBATES[0];
}

export function debatesByStatus(status: Debate["status"]): Debate[] {
  return DEBATES.filter((d) => d.status === status);
}

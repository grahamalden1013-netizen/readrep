import type { Issue } from "@/types/ngn";

const placeholderSource = (
  id: string,
  publisher: string,
  title: string,
  kind: "primary" | "reporting" | "analysis" | "data",
) => ({
  id,
  publisher,
  title,
  date: "Reference",
  url: "#",
  kind,
  isPlaceholder: true,
});

export const issuesSetB: Issue[] = [
  {
    slug: "healthcare",
    name: "Healthcare",
    category: "health",
    shortDescription:
      "Who is covered, who pays, and why prices are so hard to find out in advance.",
    cover: { pattern: "arc", hue: 350 },
    basics: [
      "The United States uses a mixed system: employer-sponsored insurance, Medicare for people 65 and older and some people with disabilities, Medicaid for people with low incomes, individual marketplaces created by the Affordable Care Act, and people with no coverage.",
      "Each payer negotiates prices separately, so the same procedure at the same hospital can carry different prices depending on who is paying.",
      "Employer premiums are generally treated by economists as part of total compensation — money that would otherwise be available as wages.",
      "The Affordable Care Act, enacted in 2010, created marketplaces with income-based subsidies, expanded Medicaid eligibility at state option, and prohibited denying coverage for pre-existing conditions.",
    ],
    whyDebated: [
      "People disagree about whether health care is best organized as a market with informed consumers or as a public utility, and that framing drives everything else.",
      "Cost control and access can pull against each other: measures that lower prices can reduce provider revenue, which matters most for hospitals with thin margins.",
      "Federal and state responsibilities are intertwined, so the same program can look very different depending on the state.",
      "Projected costs of large proposals vary widely because they depend on contested assumptions about payment rates and utilization.",
    ],
    democraticViews: [
      "Many Democratic lawmakers support extending marketplace subsidies and encouraging remaining states to expand Medicaid.",
      "A common position among Democratic leaders is support for Medicare drug price negotiation and out-of-pocket caps.",
      "Many emphasize coverage as the primary goal, with cost control pursued through public program leverage.",
    ],
    republicanViews: [
      "Many Republican lawmakers emphasize price transparency and competition as the route to lower costs.",
      "A common position among Republican leaders is support for health savings accounts and more plan flexibility.",
      "Many favor giving states more control over Medicaid design through waivers or block grants.",
    ],
    democraticDisagreements: [
      "The party is genuinely divided between members supporting incremental expansion of existing programs and members supporting single-payer coverage.",
      "Members disagree on whether a public option should compete with private plans or replace them.",
    ],
    republicanDisagreements: [
      "Members in states that expanded Medicaid have resisted proposals to reduce federal matching funds.",
      "Some Republicans support drug price measures the party's leadership has opposed.",
    ],
    otherPerspectives: [
      {
        label: "Hospitals and physicians",
        summary: "Providers focus on payment rates and workforce.",
        points: [
          "Argue public program rates fall below cost, shifting costs to private payers.",
          "Rural hospital groups warn that reimbursement changes threaten facility closures.",
        ],
      },
      {
        label: "Health economists",
        summary: "Researchers agree on diagnosis more than on remedy.",
        points: [
          "Broad agreement that the United States pays higher prices than peer countries for comparable services.",
          "Real disagreement about effects of price regulation on innovation.",
        ],
      },
      {
        label: "Patient advocacy groups",
        summary: "These groups focus on the friction patients actually meet.",
        points: [
          "Prioritize surprise billing, prior authorization and network adequacy.",
          "Note that medical debt affects insured households too.",
        ],
      },
    ],
    keyTerms: [
      { term: "Premium", definition: "The recurring payment for insurance coverage." },
      {
        term: "Deductible",
        definition:
          "What a patient pays out of pocket before insurance covers most costs.",
      },
      {
        term: "Medicaid expansion",
        definition:
          "The Affordable Care Act option allowing states to extend Medicaid to more low-income adults with federal funding support.",
      },
      {
        term: "Public option",
        definition:
          "A government insurance plan offered alongside private plans rather than replacing them.",
      },
    ],
    sources: [
      placeholderSource("iss-health-1", "Centers for Medicare & Medicaid Services", "National Health Expenditure Accounts", "data"),
      placeholderSource("iss-health-2", "Congressional Budget Office", "Coverage projections", "analysis"),
      placeholderSource("iss-health-3", "U.S. Department of Health and Human Services", "Price transparency regulations", "primary"),
    ],
    relatedArticleSlugs: ["why-american-health-care-costs-what-it-does"],
  },
  {
    slug: "education",
    name: "Education",
    category: "education",
    shortDescription:
      "Who runs schools, who funds them, and what the federal government can and cannot require.",
    cover: { pattern: "grid", hue: 230 },
    basics: [
      "Education in the United States is primarily a state and local responsibility. Most funding comes from state and local sources, with the federal government contributing a smaller share.",
      "Local school boards, usually elected, set district policy. State boards and legislatures set standards, graduation requirements and funding formulas.",
      "The federal role is mainly conditional funding and civil rights enforcement — for example, requirements attached to Title I funds for schools serving low-income students, and services for students with disabilities under IDEA.",
      "Higher education involves a separate set of policies: federal student aid, loan programs, accreditation and institutional reporting requirements.",
    ],
    whyDebated: [
      "Funding formulas based on local property taxes produce large differences between districts, which raises questions about equity that states resolve differently.",
      "Curriculum decisions touch values directly, so disagreements about history, health and library materials become political quickly.",
      "There is genuine research disagreement about what improves outcomes at scale — class size, teacher pay, instructional method, and school choice have all been studied with mixed results.",
      "The people most affected — students — generally cannot vote in the elections that decide these policies.",
    ],
    democraticViews: [
      "Many Democratic lawmakers support increased federal funding for public schools and higher teacher pay.",
      "A common position among Democratic leaders is opposition to voucher programs that direct public funds to private schools.",
      "Many support expanded student loan relief and increased Pell Grant funding.",
    ],
    republicanViews: [
      "Many Republican lawmakers support school choice programs including vouchers and education savings accounts.",
      "A common position among Republican leaders is emphasis on parental rights in curriculum and materials decisions.",
      "Many favor reducing the federal role and returning decisions to states and districts.",
    ],
    democraticDisagreements: [
      "Members differ on charter schools, with some supporting expansion and others aligning with teachers' unions in opposition.",
      "There is disagreement about how broad student loan relief should be and who should qualify.",
    ],
    republicanDisagreements: [
      "Rural Republicans have opposed voucher programs that could draw funding from districts with only one school.",
      "Members differ on federal accountability testing requirements.",
    ],
    otherPerspectives: [
      {
        label: "Teachers and their unions",
        summary: "Educators emphasize working conditions and staffing.",
        points: [
          "Cite staffing shortages, special education caseloads and pay relative to other professions.",
          "Argue mandates without funding shift costs onto classrooms.",
        ],
      },
      {
        label: "Students",
        summary:
          "Student organizations increasingly participate in board and legislative processes.",
        points: [
          "Commonly ask to be consulted before policies affecting the school day are adopted.",
          "Focus on mental health services, schedule design and course access.",
        ],
      },
      {
        label: "Higher education researchers",
        summary: "Analysts separate cost, debt and value questions.",
        points: [
          "Note that outcomes vary far more by institution and program than by sector overall.",
          "Emphasize completion rates as more predictive of debt burden than tuition alone.",
        ],
      },
    ],
    keyTerms: [
      {
        term: "Title I",
        definition:
          "Federal funding for schools serving high concentrations of students from low-income families, with conditions attached.",
      },
      {
        term: "IDEA",
        definition:
          "The Individuals with Disabilities Education Act, which requires public schools to provide services to eligible students with disabilities.",
      },
      {
        term: "School choice",
        definition:
          "Policies letting public funds follow a student to a school other than their assigned public school, including charters, vouchers and education savings accounts.",
      },
      {
        term: "Pell Grant",
        definition:
          "Federal aid for undergraduate students with financial need that does not have to be repaid.",
      },
    ],
    sources: [
      placeholderSource("iss-edu-1", "National Center for Education Statistics", "Digest of Education Statistics", "data"),
      placeholderSource("iss-edu-2", "U.S. Department of Education", "Program regulations and guidance", "primary"),
      placeholderSource("iss-edu-3", "State education agencies", "Funding formula documentation", "primary"),
    ],
    relatedArticleSlugs: ["phones-in-schools-policy-explained"],
  },
  {
    slug: "voting-elections",
    name: "Voting & Elections",
    category: "elections",
    shortDescription:
      "How elections are actually run, who runs them, and what the fights over the rules are about.",
    cover: { pattern: "grid", hue: 210 },
    basics: [
      "Elections in the United States are administered by states and, in practice, by thousands of county and municipal officials. There is no national election administration.",
      "The Constitution gives states authority over the times, places and manner of congressional elections, while allowing Congress to alter those regulations.",
      "The president is elected through the Electoral College. Each state has electors equal to its total congressional delegation, and most states award all electors to the statewide winner.",
      "District boundaries for the House and state legislatures are redrawn after each decennial census, usually by state legislatures and sometimes by independent commissions.",
    ],
    whyDebated: [
      "Rules about registration, mail voting, identification and early voting affect who finds it easy to vote, so both parties analyze them for partisan effect.",
      "There is disagreement about the balance between access and verification, and both goals have legitimate support.",
      "Claims about election integrity have themselves become a political dispute, with courts and state officials of both parties repeatedly reviewing specific allegations.",
      "Because administration is local, the same national argument plays out differently in thousands of jurisdictions.",
    ],
    democraticViews: [
      "Many Democratic lawmakers support federal minimum standards for early and mail voting and automatic voter registration.",
      "A common position among Democratic leaders is support for restoring federal preclearance review of election law changes in certain jurisdictions.",
      "Many support independent redistricting commissions.",
    ],
    republicanViews: [
      "Many Republican lawmakers support voter identification requirements and tighter mail ballot procedures.",
      "A common position among Republican leaders is that election rules are constitutionally a state responsibility.",
      "Many emphasize voter roll maintenance and post-election audit procedures.",
    ],
    democraticDisagreements: [
      "Members disagree about whether to pursue broad federal election legislation or targeted measures with bipartisan support.",
      "Some Democrats have supported voter identification requirements paired with expanded access provisions.",
    ],
    republicanDisagreements: [
      "State election officials in the party have publicly defended the accuracy of elections they administered against claims from within their own party.",
      "Members differ on ranked-choice voting, which some support as a moderating reform and others oppose.",
    ],
    otherPerspectives: [
      {
        label: "Election administrators",
        summary:
          "The nonpartisan officials who run elections focus on operations and staffing.",
        points: [
          "Cite funding, recruitment of poll workers and equipment replacement cycles as their main constraints.",
          "Report increased threats and turnover as a serious workforce problem.",
        ],
      },
      {
        label: "Reform organizations",
        summary:
          "Groups advocating structural change often sit outside both parties.",
        points: [
          "Advocate for ranked-choice voting, open primaries or multi-member districts.",
          "Argue primary election rules, not general elections, determine most outcomes in safe districts.",
        ],
      },
      {
        label: "Voting rights organizations",
        summary: "These groups focus on access and representation.",
        points: [
          "Track how specific procedural rules affect turnout among particular communities.",
          "Litigate under the Voting Rights Act and state constitutions.",
        ],
      },
    ],
    keyTerms: [
      {
        term: "Electoral College",
        definition:
          "The body that formally elects the president. Each state's electors equal its total congressional delegation.",
      },
      {
        term: "Redistricting",
        definition:
          "Redrawing legislative district boundaries after each census.",
      },
      {
        term: "Provisional ballot",
        definition:
          "A ballot cast when eligibility is uncertain, counted only after officials verify the voter's status.",
      },
      {
        term: "Certification",
        definition:
          "The formal process by which officials confirm and finalize election results.",
      },
    ],
    sources: [
      placeholderSource("iss-vote-1", "U.S. Election Assistance Commission", "Election Administration and Voting Survey", "data"),
      placeholderSource("iss-vote-2", "State secretaries of state", "Election procedures manuals", "primary"),
      placeholderSource("iss-vote-3", "National Conference of State Legislatures", "State election law database", "analysis"),
    ],
    relatedArticleSlugs: ["redistricting-explained"],
  },
  {
    slug: "foreign-policy",
    name: "Foreign Policy",
    category: "foreign-policy",
    shortDescription:
      "Alliances, aid, trade and the use of force — and which branch of government decides what.",
    cover: { pattern: "orbit", hue: 25 },
    basics: [
      "The Constitution divides foreign policy authority. The president commands the armed forces and directs diplomacy; Congress declares war, controls all spending and ratifies treaties by a two-thirds Senate vote.",
      "Congress last formally declared war in 1942. Military operations since then have proceeded under authorizations for the use of military force, treaty obligations or claimed executive authority.",
      "Foreign assistance includes military aid, development and global health programs, and humanitarian relief. It is a much smaller share of the federal budget than public surveys typically estimate.",
      "Treaty alliances such as NATO create standing commitments; NATO's Article 5 treats an armed attack on one member as an attack on all, while leaving each member to determine its response.",
    ],
    whyDebated: [
      "The constitutional line between presidential and congressional authority has never been definitively settled, and courts generally avoid resolving it.",
      "People disagree about the purpose of American power abroad: deterrence, humanitarian obligation, commercial interest, or restraint.",
      "Costs are visible and immediate; benefits like deterrence are counterfactual and hard to demonstrate.",
      "Domestic economic effects of trade and sanctions fall unevenly across regions and industries.",
    ],
    democraticViews: [
      "Many Democratic lawmakers emphasize alliance commitments and multilateral institutions.",
      "A common position among Democratic leaders is support for sustained development and global health funding.",
      "Many support conditioning military assistance on human rights standards.",
    ],
    republicanViews: [
      "Many Republican lawmakers prioritize defense spending and allied burden-sharing.",
      "A common position among Republican leaders is skepticism of non-military foreign assistance without strict conditions.",
      "Many emphasize competition with strategic rivals as the organizing framework.",
    ],
    democraticDisagreements: [
      "A faction consistently opposes arms transfers and military deployments that party leadership supports.",
      "Members differ on trade agreements, with labor-aligned members frequently opposed.",
    ],
    republicanDisagreements: [
      "The party contains a significant divide between traditional internationalists and members favoring substantially reduced overseas commitments.",
      "Members disagree about tariffs and about the value of multilateral trade agreements.",
    ],
    otherPerspectives: [
      {
        label: "War powers advocates",
        summary:
          "A cross-party group pushes Congress to reclaim authorization authority.",
        points: [
          "Argue older authorizations have been stretched to cover operations Congress never voted on.",
          "Have introduced bipartisan repeal-and-replace measures.",
        ],
      },
      {
        label: "Humanitarian organizations",
        summary: "Aid groups focus on delivery and predictability.",
        points: [
          "Argue funding volatility disrupts multi-year health and food programs.",
          "Distinguish civilian aid from assistance routed through military channels.",
        ],
      },
      {
        label: "Defense industry and analysts",
        summary: "This community focuses on capability and procurement timelines.",
        points: [
          "Emphasize production capacity constraints for munitions and shipbuilding.",
          "Debate the balance between legacy platforms and emerging technology.",
        ],
      },
    ],
    keyTerms: [
      {
        term: "AUMF",
        definition:
          "Authorization for Use of Military Force — congressional approval for military action short of a declared war.",
      },
      {
        term: "Sanctions",
        definition:
          "Restrictions on trade or financial transactions used as a foreign policy tool.",
      },
      {
        term: "Article 5",
        definition:
          "NATO's mutual defense provision treating an attack on one member as an attack on all.",
      },
      {
        term: "Ratification",
        definition:
          "Senate approval of a treaty, requiring a two-thirds vote.",
      },
    ],
    sources: [
      placeholderSource("iss-fp-1", "U.S. Constitution", "Article I and Article II", "primary"),
      placeholderSource("iss-fp-2", "Congressional Research Service", "War powers and foreign assistance reports", "analysis"),
      placeholderSource("iss-fp-3", "U.S. Department of State", "Congressional Budget Justification", "data"),
    ],
    relatedArticleSlugs: ["who-decides-american-foreign-policy"],
  },
  {
    slug: "criminal-justice",
    name: "Criminal Justice",
    category: "justice",
    shortDescription:
      "Policing, courts, sentencing and incarceration — mostly run by states and cities, not Washington.",
    cover: { pattern: "column", hue: 15 },
    basics: [
      "The overwhelming majority of criminal cases in the United States are handled by state and local systems. Federal prosecution covers a small share of total cases.",
      "Most criminal convictions result from plea agreements rather than trials, which makes charging decisions and sentencing exposure central to outcomes.",
      "Cash bail decisions occur before any determination of guilt and affect whether someone awaits trial in custody or at home.",
      "Policing is highly decentralized: there are thousands of separate law enforcement agencies with their own policies, training standards and oversight structures.",
    ],
    whyDebated: [
      "Crime data is genuinely difficult to interpret: reporting is voluntary for many agencies, categories change, and short-term fluctuations are often statistically noisy.",
      "People disagree about the primary purpose of the system — deterrence, incapacitation, rehabilitation or retribution — and different purposes imply different policies.",
      "Reforms are frequently evaluated on outcomes that take years to appear, while political attention follows individual incidents.",
      "Racial disparities in enforcement and sentencing are documented, but their causes and remedies are contested.",
    ],
    democraticViews: [
      "Many Democratic lawmakers support sentencing reform, particularly for nonviolent drug offenses.",
      "A common position among Democratic leaders is support for police accountability measures and data collection requirements.",
      "Many support diversion programs and expanded mental health and substance use treatment as alternatives to incarceration.",
    ],
    republicanViews: [
      "Many Republican lawmakers emphasize law enforcement funding and prosecution of violent crime.",
      "A common position among Republican leaders is opposition to eliminating cash bail without alternatives.",
      "Many support reentry and workforce programs, an area with notable bipartisan agreement.",
    ],
    democraticDisagreements: [
      "Big-city Democratic officials have split sharply over prosecutorial policy and bail reform.",
      "Members disagree about federal funding conditions on local police departments.",
    ],
    republicanDisagreements: [
      "A significant group of Republicans has supported sentencing and reentry reform, sometimes over party leadership objections.",
      "Members differ on qualified immunity and on federal oversight of local departments.",
    ],
    otherPerspectives: [
      {
        label: "Prosecutors and defense attorneys",
        summary:
          "Practitioners on both sides describe capacity problems rather than ideology.",
        points: [
          "Public defender offices report caseloads far above recommended standards.",
          "Prosecutors cite staffing shortages and case backlogs.",
        ],
      },
      {
        label: "Crime victims' organizations",
        summary:
          "Victim advocacy groups do not align uniformly with either party.",
        points: [
          "Many surveys of crime victims show substantial support for prevention and rehabilitation investment.",
          "Others prioritize sentence length and notification rights.",
        ],
      },
      {
        label: "Researchers",
        summary: "Criminologists emphasize measurement limits.",
        points: [
          "Note that national crime statistics depend on voluntary agency reporting, creating gaps.",
          "Find that many widely debated policies have smaller measured effects than either side claims.",
        ],
      },
    ],
    keyTerms: [
      {
        term: "Plea bargain",
        definition:
          "An agreement in which a defendant pleads guilty, usually to a reduced charge or sentence, resolving a case without trial.",
      },
      {
        term: "Cash bail",
        definition:
          "Money paid to secure release before trial, returned if the person appears in court.",
      },
      {
        term: "Mandatory minimum",
        definition:
          "A sentence length set by statute that a judge cannot go below for a given offense.",
      },
      {
        term: "Qualified immunity",
        definition:
          "A legal doctrine that can shield government officials, including police, from civil liability in certain circumstances.",
      },
    ],
    sources: [
      placeholderSource("iss-cj-1", "Bureau of Justice Statistics", "National criminal justice data series", "data"),
      placeholderSource("iss-cj-2", "Federal Bureau of Investigation", "Uniform Crime Reporting program", "data"),
      placeholderSource("iss-cj-3", "United States Sentencing Commission", "Sentencing data reports", "analysis"),
    ],
    relatedArticleSlugs: [],
  },
  {
    slug: "technology",
    name: "Technology & AI",
    category: "technology",
    shortDescription:
      "Platforms, privacy, artificial intelligence — and the question of which government writes the rules.",
    cover: { pattern: "orbit", hue: 255 },
    basics: [
      "There is no comprehensive federal privacy law covering most commercial data collection. Several states have enacted their own, creating different rules by state.",
      "Section 230, enacted in 1996, generally provides that online services are not treated as the publisher of user content and may moderate in good faith.",
      "The First Amendment restricts government action on speech. It does not directly govern moderation decisions by private companies, though laws regulating those decisions raise their own constitutional questions.",
      "Artificial intelligence is currently governed by a mix of state statutes, existing federal law applied by agencies, and voluntary frameworks — not by a comprehensive federal statute.",
    ],
    whyDebated: [
      "Preemption is the pivotal structural question: whether federal rules should replace state ones or set a floor states may exceed.",
      "Both parties want to regulate platforms, but for substantially different reasons, which makes agreement on any specific text difficult.",
      "Technology moves faster than legislation, so agencies apply older statutes to new systems, and courts then review whether that stretch is lawful.",
      "Research on social media effects, particularly on adolescents, is genuinely contested among researchers.",
    ],
    democraticViews: [
      "Many Democratic lawmakers support requirements addressing algorithmic discrimination in hiring, housing and lending.",
      "A common position among Democratic leaders is support for stronger protections for minors and default privacy settings.",
      "Many favor preserving state authority rather than broad federal preemption.",
    ],
    republicanViews: [
      "Many Republican lawmakers argue large platforms have moderated political speech unevenly and support limits on that discretion.",
      "A common position among Republican leaders is preference for a single national standard over a state patchwork.",
      "Many warn that heavy AI regulation would entrench incumbents and shift development abroad.",
    ],
    democraticDisagreements: [
      "Members differ on antitrust enforcement against large technology firms, particularly where those firms are major regional employers.",
      "There is disagreement about whether federal privacy law should preempt stronger state laws.",
    ],
    republicanDisagreements: [
      "Free-market Republicans oppose telling private companies what they must publish, putting them at odds with colleagues supporting must-carry rules.",
      "Members differ on whether Section 230 should be narrowed or repealed outright.",
    ],
    otherPerspectives: [
      {
        label: "Civil liberties organizations",
        summary:
          "These groups often oppose proposals from both parties on the same principle.",
        points: [
          "Argue both must-carry mandates and takedown pressure hand government control over private speech.",
          "Warn that narrowing Section 230 would lead platforms to remove far more lawful content.",
        ],
      },
      {
        label: "Researchers and child safety advocates",
        summary: "Specialists focus on design rather than individual posts.",
        points: [
          "Argue ranking and recommendation systems drive more measurable effect than specific takedowns.",
          "Disagree among themselves about the size of documented harms.",
        ],
      },
      {
        label: "Smaller developers",
        summary:
          "Independent and open-source developers often oppose both large firms and the strictest proposals.",
        points: [
          "Warn audit and licensing requirements scale badly for small teams.",
          "Argue open model weights improve outside scrutiny; critics say they remove safeguards.",
        ],
      },
    ],
    keyTerms: [
      {
        term: "Section 230",
        definition:
          "A 1996 statute providing that online services are generally not treated as the publisher of user-posted content.",
      },
      {
        term: "Preemption",
        definition:
          "When federal law displaces state law. Central to nearly every technology policy proposal.",
      },
      {
        term: "Interoperability",
        definition:
          "Requirements that services work with each other, proposed as a competition remedy.",
      },
      {
        term: "Data minimization",
        definition:
          "A privacy principle limiting collection to what is necessary for a stated purpose.",
      },
    ],
    sources: [
      placeholderSource("iss-tech-1", "U.S. Code", "47 U.S.C. Section 230", "primary"),
      placeholderSource("iss-tech-2", "National Institute of Standards and Technology", "AI Risk Management Framework", "primary"),
      placeholderSource("iss-tech-3", "Federal Trade Commission", "Consumer protection guidance", "primary"),
    ],
    relatedArticleSlugs: ["who-gets-to-regulate-ai", "supreme-court-online-speech-explained"],
  },
];

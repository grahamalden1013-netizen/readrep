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

export const issuesSetA: Issue[] = [
  {
    slug: "immigration",
    name: "Immigration",
    category: "immigration",
    shortDescription:
      "Who may enter the country, who may stay, and how those decisions are made and enforced.",
    cover: { pattern: "wave", hue: 170 },
    basics: [
      "Immigration law is federal. Congress writes the statutes, executive agencies administer them, and immigration courts inside the Department of Justice decide individual cases.",
      "There are several distinct pathways: family-based immigration, employment-based immigration, refugee and asylum protection, temporary visas for work and study, and the diversity visa lottery.",
      "Annual caps limit how many people can receive permanent residence in most categories, and per-country limits mean applicants from high-demand countries can wait far longer than others.",
      "Roughly speaking, the policy debate covers four areas at once: border enforcement, asylum processing, legal immigration levels, and the status of people already living in the country without permanent authorization.",
    ],
    whyDebated: [
      "The system's capacity and its rules were set in earlier eras, and Congress has not comprehensively updated them in decades — so administrations use executive authority instead, which reverses with each election.",
      "People disagree about goals, not just methods: whether immigration policy should primarily serve labor market needs, family reunification, humanitarian obligation, or border control.",
      "Costs and benefits fall unevenly. Federal revenue, state budgets, local school and hospital systems, and specific labor sectors are each affected differently.",
      "The vocabulary is contested. Terms like amnesty, open borders and crisis carry political weight that outruns their technical meaning.",
    ],
    democraticViews: [
      "Many Democratic lawmakers argue enforcement funding should be paired with expanded legal pathways rather than passed alone.",
      "A common position among Democratic leaders is support for permanent status for people brought to the country as children.",
      "Many emphasize hiring more immigration judges and asylum officers to reduce case backlogs, arguing delay is itself a driver of the problem.",
    ],
    republicanViews: [
      "Many Republican lawmakers argue enforcement capacity must be increased before any expansion of legal status is considered.",
      "A common position among Republican leaders is that the standard for initial asylum screening should be raised.",
      "Many emphasize detention capacity and faster removal of denied claims as core to deterrence.",
    ],
    democraticDisagreements: [
      "Members representing border districts have at times supported enforcement measures that national party leaders opposed.",
      "Labor-aligned Democrats have historically been more cautious about expanding temporary work visa programs than business-aligned members.",
      "The party disagrees internally about how much executive action should be used when legislation stalls.",
    ],
    republicanDisagreements: [
      "Agriculture and hospitality-state Republicans frequently support expanded temporary worker programs that immigration restrictionists in the party oppose.",
      "Business-aligned Republicans generally favor higher levels of skilled immigration; others oppose increases in any category.",
      "Members differ on whether legal status for long-resident populations should ever be part of a deal.",
    ],
    otherPerspectives: [
      {
        label: "Employers and industry groups",
        summary:
          "Sector organizations often argue for expanded legal immigration regardless of the enforcement debate.",
        points: [
          "Agriculture, construction, hospitality and health care employers report persistent labor shortages.",
          "Many push for streamlined temporary visa programs rather than changes to permanent immigration.",
        ],
      },
      {
        label: "Local government officials",
        summary:
          "Mayors and county officials of both parties tend to focus on operational costs and predictability.",
        points: [
          "Request federal reimbursement for shelter, transport and medical costs.",
          "Emphasize coordination and advance notice from federal agencies.",
        ],
      },
      {
        label: "Legal aid and advocacy organizations",
        summary: "These groups focus on process rather than immigration levels.",
        points: [
          "Note there is no right to a government-provided attorney in immigration court.",
          "Argue backlogs and detention conditions are administrative failures that legislation rarely addresses.",
        ],
      },
    ],
    keyTerms: [
      {
        term: "Asylum",
        definition:
          "Protection for someone already in the United States who shows a well-founded fear of persecution on specific legal grounds.",
      },
      {
        term: "Lawful permanent resident",
        definition:
          "A person authorized to live and work permanently in the United States. Commonly called a green card holder.",
      },
      {
        term: "Removal",
        definition:
          "The legal term for deportation, decided through immigration court proceedings.",
      },
      {
        term: "Per-country cap",
        definition:
          "A limit on how many immigrant visas may go to nationals of any single country in a year, which creates very different wait times by nationality.",
      },
    ],
    sources: [
      placeholderSource("iss-imm-1", "U.S. Citizenship and Immigration Services", "Policy manual", "primary"),
      placeholderSource("iss-imm-2", "Executive Office for Immigration Review", "Immigration court statistics", "data"),
      placeholderSource("iss-imm-3", "Congressional Research Service", "Immigration policy report series", "analysis"),
    ],
    relatedArticleSlugs: ["what-is-actually-inside-an-immigration-bill"],
  },
  {
    slug: "economy",
    name: "Economy",
    category: "economy",
    shortDescription:
      "Prices, jobs, wages and growth — and the arguments about which policies move them.",
    cover: { pattern: "ridge", hue: 60 },
    basics: [
      "Economic policy runs on two tracks. Fiscal policy — taxing and spending — is set by Congress and the president. Monetary policy — interest rates and the money supply — is set by the Federal Reserve, which is structured to operate independently.",
      "The headline numbers people argue about are the unemployment rate, inflation, wage growth and gross domestic product. Each measures something specific and none captures the whole picture.",
      "Inflation measures how fast prices are rising, not how high they are. When inflation falls, prices are still above where they started.",
      "Because economic data is revised as more information arrives, early figures often change. Arguments built on a single month's number are usually weaker than they sound.",
    ],
    whyDebated: [
      "There is genuine disagreement among economists about how much any given policy affects growth, and effects often take months or years to appear.",
      "Different groups experience the same economy differently: renters and homeowners, workers and savers, and different regions can all face opposite conditions simultaneously.",
      "The tradeoffs are real. Policies that reduce inflation can raise unemployment; policies that boost employment can raise prices.",
      "Presidents are held responsible for economic conditions they only partly control, which shapes how both parties talk about causation.",
    ],
    democraticViews: [
      "Many Democratic lawmakers argue that public investment in infrastructure, energy and care work raises long-run growth.",
      "A common position among Democratic leaders is that the tax code should raise more revenue from high earners and large corporations.",
      "Many emphasize wage growth and labor bargaining power as the central measure of economic health.",
    ],
    republicanViews: [
      "Many Republican lawmakers argue lower taxes and lighter regulation increase investment and growth.",
      "A common position among Republican leaders is that federal spending growth and debt levels pose a long-run risk.",
      "Many emphasize expanded domestic energy production as a broad input cost reduction.",
    ],
    democraticDisagreements: [
      "Members differ sharply on trade policy, with some favoring tariffs to protect domestic manufacturing and others opposing them as consumer taxes.",
      "The party disagrees about deficit tolerance — some members treat deficits as a serious constraint, others as secondary to investment.",
    ],
    republicanDisagreements: [
      "Traditional free-trade Republicans and newer protectionist members disagree fundamentally about tariffs.",
      "Fiscal hawks and members prioritizing tax cuts disagree about whether deficit reduction or rate reduction comes first.",
    ],
    otherPerspectives: [
      {
        label: "Labor organizations",
        summary: "Unions focus on the distribution of growth rather than its total.",
        points: [
          "Emphasize that productivity gains and wage gains have diverged over decades.",
          "Support sectoral bargaining and stronger enforcement of existing labor law.",
        ],
      },
      {
        label: "Small business associations",
        summary: "Smaller employers often diverge from large-company positions.",
        points: [
          "Frequently cite credit access and compliance costs as bigger constraints than tax rates.",
          "Report labor availability as a persistent operating problem.",
        ],
      },
    ],
    keyTerms: [
      {
        term: "Gross domestic product (GDP)",
        definition:
          "The total value of goods and services produced in the country. A measure of size, not of how gains are distributed.",
      },
      {
        term: "Monetary policy",
        definition:
          "Federal Reserve decisions about interest rates and the money supply, made independently of Congress and the president.",
      },
      {
        term: "Fiscal policy",
        definition: "Government decisions about taxing and spending.",
      },
      {
        term: "Recession",
        definition:
          "A significant, broad decline in economic activity lasting more than a few months. In the United States it is formally dated by a private research committee, not by a fixed formula.",
      },
    ],
    sources: [
      placeholderSource("iss-econ-1", "Bureau of Labor Statistics", "Employment and price data releases", "data"),
      placeholderSource("iss-econ-2", "Bureau of Economic Analysis", "GDP and personal income releases", "data"),
      placeholderSource("iss-econ-3", "Congressional Budget Office", "Budget and Economic Outlook", "analysis"),
    ],
    relatedArticleSlugs: ["why-prices-still-feel-high"],
  },
  {
    slug: "taxes",
    name: "Taxes",
    category: "economy",
    shortDescription:
      "Who pays, how much, and what the government does with it — the argument underneath most other arguments.",
    cover: { pattern: "column", hue: 45 },
    basics: [
      "Federal revenue comes mainly from individual income taxes and payroll taxes, with corporate income taxes and excise taxes making up smaller shares.",
      "The individual income tax is progressive: income is divided into brackets, and higher brackets are taxed at higher rates. A common misunderstanding is that moving into a higher bracket raises the rate on all your income — it does not, only on the income within that bracket.",
      "Payroll taxes fund Social Security and Medicare and apply from the first dollar of wages, which makes them a larger share of income for lower earners.",
      "Deductions and credits change what is actually owed. Tax expenditures — provisions that reduce taxes for particular activities — function much like spending programs but appear differently in the budget.",
    ],
    whyDebated: [
      "Tax policy involves both a factual question — what effect does a change have on growth and revenue — and a values question about fairness. The two get argued as if they were one.",
      "Many major tax provisions carry expiration dates, so Congress must revisit them, which repeatedly reopens the whole debate.",
      "Economists disagree about incidence: who ultimately bears the cost of a tax, which is not always who writes the check.",
      "Revenue estimates depend on assumptions about behavior, so credible analysts can produce different numbers for the same proposal.",
    ],
    democraticViews: [
      "Many Democratic lawmakers argue the tax code should raise more revenue from high-income households and large corporations.",
      "A common position among Democratic leaders is support for refundable credits such as an expanded child tax credit.",
      "Many emphasize enforcement funding, arguing uncollected taxes owed are a significant revenue source.",
    ],
    republicanViews: [
      "Many Republican lawmakers argue lower marginal rates on income and investment increase growth.",
      "A common position among Republican leaders is support for permanent extension of expiring individual rate cuts.",
      "Many favor simplification and oppose expanding enforcement staffing.",
    ],
    democraticDisagreements: [
      "Members from high-tax states have pushed to restore full deductibility of state and local taxes, which other Democrats view as regressive.",
      "The party disagrees about whether to pair new spending with offsetting revenue.",
    ],
    republicanDisagreements: [
      "Deficit-focused members have opposed tax cuts not paired with spending reductions.",
      "Members differ on whether tax preferences for specific industries count as market distortion or as legitimate policy.",
    ],
    otherPerspectives: [
      {
        label: "Nonpartisan budget analysts",
        summary: "Scorekeepers focus on long-run fiscal arithmetic.",
        points: [
          "Note that projected deficits are driven largely by health and retirement program growth alongside revenue levels.",
          "Emphasize that scoring windows — typically ten years — can hide costs that arrive later.",
        ],
      },
      {
        label: "State and local governments",
        summary: "Federal tax choices ripple into state budgets.",
        points: [
          "Many state tax codes reference federal definitions, so federal changes automatically alter state revenue.",
        ],
      },
    ],
    keyTerms: [
      {
        term: "Marginal tax rate",
        definition:
          "The rate applied to your next dollar of income, not to all of it.",
      },
      {
        term: "Payroll tax",
        definition:
          "Taxes on wages that fund Social Security and Medicare, paid by both employees and employers.",
      },
      {
        term: "Refundable credit",
        definition:
          "A tax credit that can produce a payment even if it exceeds the tax owed.",
      },
      {
        term: "Tax expenditure",
        definition:
          "A deduction, credit or exclusion that reduces revenue — economically similar to a spending program.",
      },
    ],
    sources: [
      placeholderSource("iss-tax-1", "Joint Committee on Taxation", "Revenue estimates and tax expenditure reports", "analysis"),
      placeholderSource("iss-tax-2", "Internal Revenue Service", "Statistics of Income", "data"),
      placeholderSource("iss-tax-3", "Congressional Budget Office", "Distribution of household income and federal taxes", "analysis"),
    ],
    relatedArticleSlugs: ["government-funding-deadline-explained"],
  },
  {
    slug: "abortion",
    name: "Abortion",
    category: "health",
    shortDescription:
      "After 2022, abortion law is decided mainly at the state level. This explains the legal structure and the range of views.",
    cover: { pattern: "arc", hue: 330 },
    basics: [
      "In 2022, the Supreme Court decided Dobbs v. Jackson Women's Health Organization, overruling Roe v. Wade and Planned Parenthood v. Casey. The ruling held that the Constitution does not confer a right to abortion and returned the question to elected officials.",
      "As a result, abortion law now varies substantially by state. Some states protect access by statute or state constitutional amendment; others prohibit or sharply restrict it. Many fall between those poles with gestational limits and procedural requirements.",
      "State supreme courts interpreting state constitutions have become a central venue, since state constitutions can protect rights the federal Constitution does not.",
      "Related legal questions include medication abortion regulated by the Food and Drug Administration, interstate travel, and the reach of older federal statutes.",
    ],
    whyDebated: [
      "This is a moral disagreement about the status of prenatal life and about bodily autonomy. It is not primarily a factual dispute, which is why more information rarely resolves it.",
      "People also disagree about who should decide: courts, state legislatures, Congress, or voters directly through ballot measures.",
      "Public opinion is not binary. Surveys consistently show substantial support for legal abortion in early pregnancy alongside support for restrictions later, meaning most people do not fit either polar position.",
      "Terminology is contested. The labels each side prefers for itself and for its opponents carry argumentative weight.",
    ],
    democraticViews: [
      "Many Democratic lawmakers support federal legislation restoring a nationwide legal standard for abortion access.",
      "A common position among Democratic leaders is opposition to state-level bans and support for protecting medication abortion availability.",
      "Many emphasize exceptions for the life and health of the pregnant person and for pregnancies resulting from rape or incest as a minimum standard.",
    ],
    republicanViews: [
      "Many Republican lawmakers support legal protections for prenatal life, with the specific limit varying widely by member and state.",
      "A common position among Republican leaders after Dobbs is that the question belongs primarily to states rather than to Congress.",
      "Many support funding for pregnancy support services and adoption as part of their policy approach.",
    ],
    democraticDisagreements: [
      "Members differ on whether to support gestational limits as part of a compromise, with some viewing any limit as unacceptable and others open to negotiated standards.",
      "There is disagreement about how far federal law should preempt state restrictions, given the same preemption tools could later be used the other way.",
    ],
    republicanDisagreements: [
      "The party is genuinely split between members who favor a national standard and members who insist the issue belongs to states.",
      "Members disagree on which exceptions to include, and several state parties have divided over this specifically.",
      "Some Republicans in competitive districts have publicly broken with restrictive proposals after ballot measure results.",
    ],
    otherPerspectives: [
      {
        label: "Voters through ballot measures",
        summary:
          "Direct democracy has become a major channel, and results have not always tracked a state's partisan lean.",
        points: [
          "Several states have voted on constitutional amendments concerning abortion since 2022, in both directions.",
          "Ballot measure outcomes have sometimes diverged from the same electorate's candidate choices.",
        ],
      },
      {
        label: "Medical organizations",
        summary:
          "Physician groups focus on clinical definitions and legal clarity.",
        points: [
          "Argue that ambiguous statutory language creates uncertainty in emergency care.",
          "Note that terms used in legislation sometimes do not match clinical terminology.",
        ],
      },
      {
        label: "Religious communities",
        summary:
          "Religious traditions differ from each other, and adherents differ within them.",
        points: [
          "Some traditions teach that life begins at conception; others hold different positions on when protections attach.",
          "Survey data consistently shows a range of views within nearly every major religious group.",
        ],
      },
    ],
    keyTerms: [
      {
        term: "Dobbs v. Jackson Women's Health Organization",
        definition:
          "The 2022 Supreme Court decision holding that the Constitution does not confer a right to abortion, returning the issue to elected officials.",
      },
      {
        term: "Gestational limit",
        definition:
          "A legal cutoff, measured in weeks of pregnancy, after which abortion is restricted.",
      },
      {
        term: "Ballot measure",
        definition:
          "A question placed directly before voters, used in several states to decide abortion policy.",
      },
      {
        term: "Preemption",
        definition:
          "When a higher level of government's law overrides a lower level's. Relevant to proposals for federal abortion standards.",
      },
    ],
    sources: [
      placeholderSource("iss-abortion-1", "Supreme Court of the United States", "Dobbs v. Jackson Women's Health Organization opinion", "primary"),
      placeholderSource("iss-abortion-2", "State legislatures", "Enacted state statutes and constitutional amendments", "primary"),
      placeholderSource("iss-abortion-3", "Nonpartisan survey organizations", "Public opinion trend data", "data"),
    ],
    relatedArticleSlugs: [],
  },
  {
    slug: "climate-change",
    name: "Climate Change",
    category: "climate",
    shortDescription:
      "What is happening to the climate, what policy tools exist, and where the political disagreement actually sits.",
    cover: { pattern: "arc", hue: 140 },
    basics: [
      "There is a scientific consensus that the climate is warming and that human greenhouse gas emissions are the primary driver. That is the assessed conclusion of major scientific bodies including the Intergovernmental Panel on Climate Change and United States federal science agencies.",
      "The political debate in the United States today is mostly not about whether warming is happening. It is about what to do: how fast, at what cost, paid by whom, and with which tools.",
      "The main policy tools are regulation of emissions under existing law, subsidies and tax credits for lower-emission technology, direct federal investment, carbon pricing, and adaptation spending for infrastructure.",
      "Because Congress has not passed a comprehensive climate statute, most federal action runs through agencies applying older laws — which means policy shifts with administrations and is frequently litigated.",
    ],
    whyDebated: [
      "Costs and benefits arrive on different schedules. Costs are immediate and concentrated in specific industries and regions; benefits are long-term and diffuse.",
      "People disagree about the appropriate discount rate — how much to weigh future harm against present cost — which is an economic and ethical judgment, not a scientific one.",
      "There is real disagreement about the role of government versus markets in driving technological transition.",
      "Because the United States is one emitter among many, there is disagreement about how much unilateral action accomplishes.",
    ],
    democraticViews: [
      "Many Democratic lawmakers support tax credits and federal investment to accelerate deployment of lower-emission energy and transportation.",
      "A common position among Democratic leaders is support for stronger EPA emissions standards under existing law.",
      "Many emphasize environmental justice — that pollution burdens fall disproportionately on specific communities.",
    ],
    republicanViews: [
      "Many Republican lawmakers emphasize energy costs and reliability, and oppose regulations they view as effectively mandating specific technologies.",
      "A common position among Republican leaders is support for nuclear power, carbon capture and permitting reform as lower-cost pathways.",
      "Many argue American emissions reductions have limited effect without commitments from the largest emitting countries.",
    ],
    democraticDisagreements: [
      "Members from energy-producing states have opposed restrictions their colleagues supported.",
      "The party disagrees about nuclear power and about whether permitting reform that speeds fossil projects is an acceptable trade for speeding transmission lines.",
    ],
    republicanDisagreements: [
      "A growing group of Republicans supports clean energy tax credits benefiting manufacturing in their districts.",
      "Members differ substantially on climate science framing, from acknowledgment paired with cost objections to continued skepticism.",
    ],
    otherPerspectives: [
      {
        label: "Utilities and grid operators",
        summary: "Operators focus on reliability constraints.",
        points: [
          "Emphasize that transmission capacity and interconnection queues limit how fast new generation reaches the grid.",
          "Warn that retirement timing of existing plants affects reliability margins.",
        ],
      },
      {
        label: "Youth climate organizations",
        summary:
          "Younger advocacy groups tend to argue that incremental timelines understate urgency.",
        points: [
          "Push for firm emission deadlines rather than incentive-based approaches alone.",
          "Have also driven litigation under state constitutional provisions.",
        ],
      },
      {
        label: "Agricultural producers",
        summary:
          "Farm groups sit on both sides, facing both regulation and climate impacts.",
        points: [
          "Support conservation program funding while opposing emissions regulation of agriculture.",
        ],
      },
    ],
    keyTerms: [
      {
        term: "Greenhouse gases",
        definition:
          "Gases including carbon dioxide and methane that trap heat in the atmosphere.",
      },
      {
        term: "Carbon pricing",
        definition:
          "Policies that attach a cost to emissions, either through a tax or a cap-and-trade market.",
      },
      {
        term: "Adaptation",
        definition:
          "Measures that reduce harm from climate effects already occurring, such as flood infrastructure — distinct from reducing emissions.",
      },
      {
        term: "Permitting reform",
        definition:
          "Changes to environmental review and approval processes for infrastructure. Supported by parts of both parties for different projects.",
      },
    ],
    sources: [
      placeholderSource("iss-climate-1", "U.S. Global Change Research Program", "National Climate Assessment", "primary"),
      placeholderSource("iss-climate-2", "Energy Information Administration", "Annual Energy Outlook", "data"),
      placeholderSource("iss-climate-3", "Environmental Protection Agency", "Greenhouse gas inventory", "data"),
    ],
    relatedArticleSlugs: ["why-car-rules-became-a-climate-fight"],
  },
  {
    slug: "gun-policy",
    name: "Gun Policy",
    category: "justice",
    shortDescription:
      "The Second Amendment, the laws built around it, and the proposals that keep returning after each debate.",
    cover: { pattern: "ridge", hue: 20 },
    basics: [
      "The Second Amendment protects the right to keep and bear arms. In District of Columbia v. Heller (2008), the Supreme Court held this is an individual right, and in New York State Rifle & Pistol Association v. Bruen (2022), it set a test requiring modern gun regulations to be consistent with the nation's historical tradition of firearm regulation.",
      "Federal law already restricts certain categories: for example, purchases by people convicted of felonies or subject to certain domestic violence orders, and it requires licensed dealers to run background checks.",
      "State laws vary widely — on permits, waiting periods, magazine capacity, carry rules and storage requirements — which is why the practical rules differ dramatically by state.",
      "Firearm deaths in the United States include suicides, homicides and accidents. Suicides account for a majority in most years, which matters because different policies target different components.",
    ],
    whyDebated: [
      "The disagreement combines a constitutional question, an empirical question about policy effectiveness, and a cultural question about the role of firearms in daily life.",
      "Research is genuinely difficult: data collection has historically been limited, and studies of specific interventions often produce mixed results.",
      "High-profile events drive legislative attention toward measures that may not address the most common categories of firearm death.",
      "Terms used in legislation, such as assault weapon, are legal definitions rather than technical ones, which makes debates about them confusing.",
    ],
    democraticViews: [
      "Many Democratic lawmakers support universal background checks covering private sales.",
      "A common position among Democratic leaders is support for extreme risk protection orders, often called red flag laws.",
      "Many support restrictions on specific categories of firearms and magazine capacity limits.",
    ],
    republicanViews: [
      "Many Republican lawmakers argue new restrictions primarily burden law-abiding owners without reducing crime.",
      "A common position among Republican leaders is emphasis on enforcement of existing law and on prosecution of illegal transfers.",
      "Many prioritize school security funding and mental health treatment over firearm restrictions.",
    ],
    democraticDisagreements: [
      "Members from rural districts have opposed restrictions supported by the party's urban members.",
      "There is disagreement about whether to pursue broad bans or narrower measures more likely to pass and to survive court review.",
    ],
    republicanDisagreements: [
      "Some Republicans have supported extreme risk protection orders and enhanced background checks, particularly at the state level.",
      "Members differ on whether federal preemption of state carry rules is consistent with federalism principles they otherwise defend.",
    ],
    otherPerspectives: [
      {
        label: "Public health researchers",
        summary:
          "Researchers frame firearm deaths as a public health problem with several distinct components.",
        points: [
          "Emphasize suicide prevention measures, including secure storage, because suicides are the largest share of firearm deaths.",
          "Note that evidence quality varies substantially across proposed interventions.",
        ],
      },
      {
        label: "Gun owners' organizations",
        summary: "Owner groups vary more than coverage suggests.",
        points: [
          "Some organizations focus on training and safe storage education rather than legislation.",
          "Others treat any new restriction as a step toward broader prohibition.",
        ],
      },
      {
        label: "Law enforcement organizations",
        summary: "Police groups are divided on specific measures.",
        points: [
          "Some support red flag laws as a tool for officers responding to crisis calls.",
          "Others raise due process and enforcement burden concerns.",
        ],
      },
    ],
    keyTerms: [
      {
        term: "Background check",
        definition:
          "A federal system check required for purchases from licensed dealers. Requirements for private sales vary by state.",
      },
      {
        term: "Red flag law",
        definition:
          "A state law allowing a court to temporarily remove firearms from someone found to pose a risk. Formally called an extreme risk protection order.",
      },
      {
        term: "Bruen test",
        definition:
          "The standard from the Supreme Court's 2022 decision requiring gun regulations to be consistent with historical tradition of firearm regulation.",
      },
      {
        term: "Preemption",
        definition:
          "State laws that prevent cities from passing their own firearm rules — common in many states.",
      },
    ],
    sources: [
      placeholderSource("iss-guns-1", "Supreme Court of the United States", "Heller and Bruen opinions", "primary"),
      placeholderSource("iss-guns-2", "Centers for Disease Control and Prevention", "WISQARS injury data", "data"),
      placeholderSource("iss-guns-3", "Bureau of Alcohol, Tobacco, Firearms and Explosives", "Firearms commerce report", "data"),
    ],
    relatedArticleSlugs: [],
  },
];

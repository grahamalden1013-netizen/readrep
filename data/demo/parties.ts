import type { Party } from "@/types/ngn";

/**
 * DEMO CONTENT — see `data/demo/README.md`.
 *
 * The party explorer. Two rules hold throughout this file: parties are never
 * ranked, and no party is ever recommended. Each entry gives roughly equal
 * space to history, coalition, positions and — most importantly — internal
 * factions, because a party described without its factions is a caricature.
 */

export const PARTIES: Party[] = [
  {
    id: "party-dem",
    slug: "democratic-party",
    name: "Democratic Party",
    founded: "1828",
    summary:
      "One of the two major American parties. Its modern coalition took shape during the New Deal era and has been substantially reconfigured several times since.",
    history: [
      "The party traces its organisational lineage to the 1820s, making it among the oldest continuously operating political parties in the world.",
      "The New Deal era of the 1930s assembled a coalition of industrial workers, urban immigrants, farmers and the segregated South — a coalition whose internal contradictions defined the party for decades.",
      "The civil rights legislation of the 1960s fractured that coalition, beginning a realignment in which the South moved toward the Republican Party over the following generation.",
      "From the 1990s the party moved toward market-oriented economic positions, then shifted again after 2008 toward a larger role for direct public investment.",
      "Its coalition today is more educated, more urban and more racially diverse than it was in the mid-twentieth century, and considerably less anchored in industrial labour.",
    ],
    currentPriorities: [
      "Expanding access to health coverage and reducing out-of-pocket costs",
      "Climate policy pursued primarily through investment, tax credits and regulation",
      "Voting access and federal election administration standards",
      "Labour rights, collective bargaining and minimum wage increases",
      "Public education funding and reducing student debt burdens",
    ],
    coalitions: [
      "Urban and suburban voters, particularly in large metropolitan areas",
      "Voters with four-year college degrees, a group that has shifted toward the party over recent decades",
      "Black, Hispanic and Asian American voters, though margins vary considerably by group and by election",
      "Public sector and service sector unions",
      "Younger voters, though turnout in this group is less consistent than its partisan lean",
    ],
    commonPositions: [
      { area: "Health care", position: "Generally supports expanding public coverage and regulating costs; members differ on whether that means building on existing programmes or replacing them." },
      { area: "Climate", position: "Generally supports emissions reduction through public investment and regulation rather than carbon pricing." },
      { area: "Taxation", position: "Generally supports higher rates on high incomes and corporations to fund public programmes." },
      { area: "Elections", position: "Generally supports expanded access measures and federal administration standards." },
      { area: "Labour", position: "Generally supports higher minimum wages and strengthened collective bargaining." },
    ],
    factions: [
      {
        name: "Progressive wing",
        description:
          "Favours substantially larger public programmes, structural economic reform, and more aggressive climate policy. Frequently in open disagreement with party leadership on scale and pace.",
      },
      {
        name: "Moderate and front-line members",
        description:
          "Largely representing competitive districts. Emphasise incremental change and fiscal caution, and have repeatedly declined to support the party's larger proposals.",
      },
      {
        name: "Institutionalists",
        description:
          "Prioritise procedural norms, bipartisan legislating and the durability of institutions, sometimes at the cost of policy ambition.",
      },
      {
        name: "Labour-aligned members",
        description:
          "Centre union priorities, which sometimes puts them at odds with the party's climate and trade positions where energy or manufacturing jobs are involved.",
      },
    ],
    platformNote:
      "Party platforms are adopted at national conventions and are not binding on any officeholder. Individual Democratic lawmakers frequently vote against positions in their own party's platform. Treat a platform as a statement of coalition priorities, not as a prediction of any specific member's vote.",
  },
  {
    id: "party-rep",
    slug: "republican-party",
    name: "Republican Party",
    founded: "1854",
    summary:
      "One of the two major American parties. Founded in opposition to the expansion of slavery, its modern coalition has been reconfigured several times, most recently and substantially since 2016.",
    history: [
      "The party was founded in 1854 by opponents of extending slavery into the western territories, and elected Abraham Lincoln six years later.",
      "For much of the late nineteenth and early twentieth centuries it was the party of industrial and commercial interests, protective tariffs and a strong national banking system.",
      "The post-1945 coalition fused economic conservatism, anti-communist foreign policy and, from the 1970s, organised religious conservatives.",
      "The realignment following civil rights legislation moved the South decisively toward the party over roughly three decades.",
      "Since 2016 the coalition has shifted toward voters without four-year degrees and away from some suburban professionals, accompanied by significant changes on trade and foreign policy.",
    ],
    currentPriorities: [
      "Lower taxes and reduced regulatory burden on business",
      "Border security and changes to immigration enforcement",
      "Parental choice in education, including charter schools and savings accounts",
      "Domestic energy production and permitting reform",
      "Federalism — returning policy decisions to states where possible",
    ],
    coalitions: [
      "Rural and exurban voters across most regions",
      "Voters without four-year college degrees, a group that has shifted toward the party in recent cycles",
      "White evangelical Protestants, among the party's most consistent constituencies",
      "Small business owners and self-employed workers",
      "Older voters, who also turn out at higher rates than younger cohorts",
    ],
    commonPositions: [
      { area: "Health care", position: "Generally favours market mechanisms, price transparency and state flexibility over expanded federal programmes." },
      { area: "Climate", position: "Generally opposes carbon pricing and emissions mandates; members differ substantially on innovation funding." },
      { area: "Taxation", position: "Generally supports lower marginal rates and lower corporate taxation as a growth instrument." },
      { area: "Elections", position: "Generally supports verification measures and state control of election administration." },
      { area: "Defense", position: "Generally supports higher defense budgets, though a non-interventionist faction dissents." },
    ],
    factions: [
      {
        name: "Traditional fiscal conservatives",
        description:
          "Prioritise deficit reduction, free trade and limited government. This faction's influence on trade policy has diminished considerably since 2016.",
      },
      {
        name: "Populist and nationalist wing",
        description:
          "Favours trade protection, restrictive immigration policy and scepticism of foreign commitments. Frequently in conflict with fiscal conservatives on tariffs and entitlements.",
      },
      {
        name: "Social and religious conservatives",
        description:
          "Centre family, education and religious liberty questions. Long-standing within the coalition and sometimes at odds with its libertarian members.",
      },
      {
        name: "Libertarian-leaning members",
        description:
          "Prioritise individual liberty and limited government consistently, including on surveillance, criminal justice and drug policy, where they often align with progressive Democrats.",
      },
      {
        name: "National security traditionalists",
        description:
          "Support active alliance commitments and higher defense spending. In direct tension with the non-interventionist strand of the populist wing.",
      },
    ],
    platformNote:
      "Party platforms are adopted at national conventions and bind no officeholder. Republican lawmakers frequently vote against positions in their own party's platform, and the party's factions disagree with each other as sharply as they disagree with Democrats on several major questions.",
  },
  {
    id: "party-lib",
    slug: "libertarian-party",
    name: "Libertarian Party",
    founded: "1971",
    summary:
      "The largest third party by ballot access. Applies a consistent principle — minimal government intervention — across both economic and social questions.",
    history: [
      "Founded in 1971 by activists who considered both major parties committed to expanding federal power, in different domains.",
      "Has achieved ballot access in most or all states in many presidential cycles, an organisational achievement few third parties match.",
      "Has elected officials at local and occasionally state level, and has had members serve in Congress after changing affiliation.",
      "Its influence is often felt through the major parties rather than at the ballot box, particularly on criminal justice, surveillance and drug policy.",
    ],
    currentPriorities: [
      "Substantially reduced federal spending and taxation",
      "Ending most military intervention abroad",
      "Drug decriminalisation and criminal justice reform",
      "Strong limits on surveillance and civil asset forfeiture",
      "Free trade and open markets",
    ],
    coalitions: [
      "Voters who hold economically conservative and socially liberal positions simultaneously",
      "Technology and cryptocurrency communities",
      "Some younger voters disaffected with both major parties",
    ],
    commonPositions: [
      { area: "Economy", position: "Favours minimal regulation, low taxation and free trade." },
      { area: "Foreign policy", position: "Favours non-intervention and reduced alliance commitments." },
      { area: "Civil liberties", position: "Favours strong limits on state power over individuals, including surveillance and policing." },
      { area: "Drug policy", position: "Favours decriminalisation and an end to enforcement-led approaches." },
    ],
    factions: [
      {
        name: "Classical liberals",
        description: "Accept a limited but real state role — courts, defense, some public goods — and favour incremental reform.",
      },
      {
        name: "Anarcho-capitalists",
        description: "Argue that nearly all state functions could be provided by voluntary arrangement, and reject incrementalism.",
      },
      {
        name: "Pragmatic reformers",
        description: "Prioritise winnable coalitions with major-party members on specific issues like sentencing reform over ideological consistency.",
      },
    ],
    platformNote:
      "The party's platform is unusually explicit about applying one principle consistently, which produces positions that cut across the conventional left-right axis. Do not assume a Libertarian position from either major party's position.",
  },
  {
    id: "party-green",
    slug: "green-party",
    name: "Green Party",
    founded: "1984 (organised nationally in the 1990s)",
    summary:
      "A third party organised around ecological policy, social justice, non-violence and grassroots democracy.",
    history: [
      "Grew out of ecological and anti-nuclear movements, with state organisations forming before a national structure existed.",
      "Reached its widest national attention in the 2000 presidential election, and its role in that result remains contested.",
      "Has elected officials primarily at municipal level, where its organisational strength is concentrated.",
      "Its policy positions on climate and health care have influenced debates within the Democratic Party more than they have produced Green electoral wins.",
    ],
    currentPriorities: [
      "Rapid decarbonisation with a substantial public investment programme",
      "Single-payer health care",
      "Reduced military spending and non-intervention",
      "Campaign finance reform and proportional representation",
      "Environmental justice in communities bearing concentrated pollution",
    ],
    coalitions: [
      "Environmental activists dissatisfied with the pace of major-party climate policy",
      "Some left-leaning voters in safe districts where a third-party vote carries no strategic cost",
      "Local organisers focused on municipal environmental policy",
    ],
    commonPositions: [
      { area: "Climate", position: "Favours a large public investment programme and rapid decarbonisation timelines." },
      { area: "Health care", position: "Favours single-payer public health insurance." },
      { area: "Foreign policy", position: "Favours substantially reduced military spending and non-intervention." },
      { area: "Democracy", position: "Favours proportional representation and public campaign financing." },
    ],
    factions: [
      {
        name: "Electoral strategists",
        description: "Focus on winning local offices to build a durable base, accepting slower national visibility.",
      },
      {
        name: "Movement-focused members",
        description: "Prioritise organising and protest over electoral contests, treating campaigns primarily as a platform.",
      },
    ],
    platformNote:
      "Green Party positions frequently overlap with the Democratic Party's progressive wing but differ on foreign policy and on the value of third-party competition itself, which is a live internal disagreement.",
  },
  {
    id: "party-independent",
    slug: "independents",
    name: "Independents and Unaffiliated Voters",
    founded: "Not a party",
    summary:
      "The largest self-identified group in American politics — and the most frequently misunderstood, because it is not a coalition and holds no shared positions.",
    history: [
      "Self-identification as independent has grown over recent decades and now exceeds identification with either major party in many surveys.",
      "Research consistently finds that most self-identified independents lean toward one party and vote with it at rates close to weak partisans.",
      "A genuinely unaffiliated group does exist within this category, but it is considerably smaller than the headline number suggests.",
      "Several states allow only registered party members to vote in primaries, which shapes who registers as independent and where.",
    ],
    currentPriorities: [
      "No shared platform exists — this group holds the full range of political positions",
      "Survey research finds independents are on average less politically engaged than partisans, not more moderate",
      "Ballot access and open primary rules are the questions that most directly affect this group as a group",
    ],
    coalitions: [
      "Leaning independents, who behave much like weak partisans of the party they lean toward",
      "Genuinely unaffiliated voters, a smaller group with lower average turnout",
      "Voters in states with open primaries, where registering unaffiliated carries no cost to primary participation",
    ],
    commonPositions: [
      { area: "Everything", position: "None. Independents do not share positions; the label describes non-affiliation, not agreement." },
    ],
    factions: [
      {
        name: "Democratic leaners",
        description: "Decline the party label but vote with Democrats at rates close to weak Democrats.",
      },
      {
        name: "Republican leaners",
        description: "Decline the party label but vote with Republicans at rates close to weak Republicans.",
      },
      {
        name: "True independents",
        description: "Do not lean consistently. A genuinely small share of the electorate, with lower average turnout than partisans.",
      },
    ],
    platformNote:
      "Treating independents as a bloc with shared views is one of the most common errors in political commentary. If you cite independents in a debate, say which subgroup you mean, or the claim will not survive a rebuttal.",
  },
];

export const PARTY_BY_SLUG = new Map(PARTIES.map((p) => [p.slug, p]));

export function getParty(slug: string): Party | undefined {
  return PARTY_BY_SLUG.get(slug);
}

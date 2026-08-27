import type { Article } from "@/types/ngn";

export const vehicleClimateRules: Article = {
  id: "art-vehicle-rules",
  slug: "why-car-rules-became-a-climate-fight",
  headline: "Why Car Rules Became One of the Biggest Climate Fights",
  subheadline:
    "Most climate policy in the United States has not come from a climate law. It has come from agencies regulating vehicles and power plants under statutes written in the 1970s.",
  summary:
    "Vehicle emissions and fuel economy standards are the primary federal lever on transportation emissions. Because they are agency rules rather than statutes, they change with administrations and are repeatedly litigated.",
  inTwentySeconds:
    "Transportation is one of the largest sources of United States greenhouse gas emissions, and the main federal tool for addressing it is not a climate law — it is vehicle standards written by agencies under the Clean Air Act and fuel economy statutes. Because those are rules rather than laws, each administration can rewrite them, which is why the same fight recurs every few years and always ends up in court.",
  category: "climate",
  issueSlugs: ["climate-change", "economy"],
  quickWhatHappened:
    "Federal vehicle emissions and fuel economy standards continue to be revised, challenged in court, and complicated by the separate authority California holds under the Clean Air Act.",
  quickWhyItMatters:
    "Vehicle rules shape what cars are available and at what price, affect manufacturing employment, and represent a large share of achievable federal emissions reductions.",
  quickWhatNext:
    "Watch three tracks at once: the agency rulemaking record, litigation in the federal appeals courts, and whether Congress adjusts the underlying statutes or tax credits.",
  body: [
    {
      heading: "Why agencies, not Congress",
      paragraphs: [
        "Congress has not passed a comprehensive climate statute. What exists instead is a set of older laws — most importantly the Clean Air Act of 1970 and its amendments — that give agencies authority to regulate pollutants.",
        "The Supreme Court held in 2007 that greenhouse gases can be air pollutants under the Clean Air Act, which opened the door for the Environmental Protection Agency to regulate them.",
        "Fuel economy is regulated separately, by the Department of Transportation, under a different statute. The two systems overlap because both effectively govern how much fuel a vehicle burns.",
        "The practical consequence: most federal climate policy is administrative. It can be tightened, loosened or reversed without a new law — and it can be challenged in court by whoever objects.",
      ],
    },
    {
      heading: "California's unusual role",
      paragraphs: [
        "The Clean Air Act contains a provision that generally bars states from setting their own vehicle emissions standards, with a specific exception: California may seek a waiver from the EPA to set stricter standards, because it had its own program before the federal law existed.",
        "Other states may then choose to follow California's standards instead of the federal ones. Because those states together represent a large share of the national vehicle market, California's rules function as a second national standard.",
        "Whether the EPA grants, revokes or narrows that waiver is therefore a major policy decision in itself, and it has changed across administrations.",
      ],
    },
    {
      heading: "What the standards actually require",
      paragraphs: [
        "A common misconception is that emissions standards ban particular vehicles. Federal standards are generally fleet-average requirements: an automaker's overall fleet must meet a target, which leaves the company to decide what mix of vehicles gets it there.",
        "Manufacturers can also earn and trade credits, which adds flexibility and cost efficiency but makes the rules harder to read from the outside.",
        "Separately, tax credits for electric vehicles operate through the tax code rather than through emissions rules, with eligibility conditions tied to factors like assembly location and battery sourcing.",
      ],
    },
    {
      heading: "The arguments underneath",
      paragraphs: [
        "The disagreement is not only about climate science. It involves cost distribution, industrial policy and the limits of agency power.",
        "Supporters argue that vehicle standards have historically driven efficiency gains, that pollution imposes real costs paid by the public, and that the transition creates domestic manufacturing opportunity.",
        "Critics argue that stringent standards raise vehicle prices, that charging infrastructure and grid capacity are not ready, that supply chains for battery materials create new dependencies, and that agencies are stretching decades-old statutes beyond what Congress authorized.",
        "That last argument has become increasingly central in court, where challenges often focus less on the science than on whether the agency had authority to act at all.",
      ],
    },
  ],
  democraticView: {
    label: "Many Democratic officials",
    summary:
      "A common position among Democratic lawmakers supports stronger federal standards paired with subsidies for manufacturing and charging infrastructure.",
    points: [
      "Generally support tighter emissions and fuel economy standards and preserving California's waiver authority.",
      "Frequently emphasize tax credits and grants to build domestic battery and charging supply chains.",
      "Often frame the issue around public health effects of tailpipe pollution in addition to climate.",
    ],
  },
  republicanView: {
    label: "Many Republican officials",
    summary:
      "A common position among Republican lawmakers is that vehicle mandates raise costs for consumers and that technology choices should be left to the market.",
    points: [
      "Frequently argue standards function as an effective mandate for particular technologies and raise new vehicle prices.",
      "Many oppose California's waiver authority, arguing one state should not set national policy.",
      "Often emphasize supply chain dependence on foreign sources for battery materials as a security concern.",
    ],
  },
  otherViews: [
    {
      label: "Automakers and suppliers",
      summary:
        "The industry's central request has been predictability more than any particular stringency level.",
      points: [
        "Argue that standards reversing every few years make multi-year capital investment decisions difficult.",
        "Companies differ substantially among themselves depending on how far along their electrification investments are.",
      ],
    },
    {
      label: "Autoworker unions",
      summary:
        "Labor organizations focus on where vehicles and batteries are built rather than on the standards themselves.",
      points: [
        "Support transition policies conditioned on domestic production and wage standards.",
        "Note that electric drivetrains require different labor inputs than internal combustion, with disputed net employment effects.",
      ],
    },
    {
      label: "Energy and grid analysts",
      summary:
        "Technical analysts raise implementation questions independent of the political debate.",
      points: [
        "Emphasize that transmission capacity and charging deployment, not vehicle supply, may be the binding constraint.",
        "Point out that emissions benefits depend on the electricity mix in a given region.",
      ],
    },
  ],
  knownFacts: [
    "Congress has not enacted a comprehensive federal climate statute; most federal climate policy operates through existing environmental and tax law.",
    "The Clean Air Act was enacted in 1970 and has been amended several times.",
    "The Supreme Court ruled in 2007 that greenhouse gases may be regulated as air pollutants under the Clean Air Act.",
    "The Clean Air Act permits California to seek a waiver to set stricter vehicle standards, which other states may adopt.",
    "Federal vehicle standards are generally fleet-average requirements rather than bans on specific models.",
  ],
  uncertainties: [
    "How quickly charging infrastructure and grid capacity will expand is uncertain and varies sharply by region.",
    "The net employment effect of the vehicle transition is estimated differently by different analysts.",
    "Whether specific agency rules will survive legal challenge is frequently unresolved for years.",
  ],
  keyTerms: [
    {
      term: "Clean Air Act",
      definition:
        "The 1970 federal law giving the EPA authority to regulate air pollutants, now the main legal basis for federal climate rules.",
    },
    {
      term: "CAFE standards",
      definition:
        "Corporate Average Fuel Economy requirements, set by the Department of Transportation, governing the average fuel efficiency of an automaker's fleet.",
    },
    {
      term: "Waiver",
      definition:
        "EPA permission allowing California to set vehicle emissions standards stricter than federal ones, which other states may then adopt.",
    },
    {
      term: "Rulemaking",
      definition:
        "The formal process agencies use to write regulations, including public comment periods and a written justification that courts can review.",
    },
  ],
  sources: [
    {
      id: "src-epa-vehicles",
      publisher: "Environmental Protection Agency",
      title: "Light-duty vehicle emissions standards rulemaking docket",
      date: "By rulemaking",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
    {
      id: "src-nhtsa-cafe",
      publisher: "National Highway Traffic Safety Administration",
      title: "Corporate Average Fuel Economy standards",
      date: "By rulemaking",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
    {
      id: "src-eia",
      publisher: "U.S. Energy Information Administration",
      title: "Annual Energy Outlook",
      date: "Annual",
      url: "#",
      kind: "data",
      isPlaceholder: true,
    },
  ],
  authorId: "ngn-desk",
  type: "news",
  status: "published",
  publishedAt: "2026-08-25T12:45:00.000Z",
  updatedAt: "2026-08-25T12:45:00.000Z",
  readTime: 6,
  cover: { pattern: "arc", hue: 140 },
  featured: false,
  significance: 76,
  isDemo: true,
};

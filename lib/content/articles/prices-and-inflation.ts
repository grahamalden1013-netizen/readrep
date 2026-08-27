import type { Article } from "@/types/ngn";

export const pricesAndInflation: Article = {
  id: "art-prices",
  slug: "why-prices-still-feel-high",
  headline:
    "Inflation Slowing Down Does Not Mean Prices Go Back Down. Here Is Why.",
  subheadline:
    "One of the most common misunderstandings in economic news is the difference between a rate of change and a level. It explains an entire category of political argument.",
  summary:
    "Inflation measures how fast prices are rising, not how high they are. When inflation falls, prices are still higher than before — which is why economic data and lived experience can point in opposite directions.",
  inTwentySeconds:
    "Inflation is a speed, not a height. If inflation drops from high to low, prices are still above where they started — they are just climbing more slowly. That gap between 'the data improved' and 'my grocery bill did not' is real, and it is the source of a huge amount of political disagreement about whether the economy is good.",
  category: "economy",
  issueSlugs: ["economy", "taxes"],
  quickWhatHappened:
    "Price growth and price levels are separate measurements, and they can move in different directions at the same time. Political arguments about the economy often use one to argue about the other.",
  quickWhyItMatters:
    "How people feel about prices shapes elections, and both parties build economic messages around it. Knowing which number is being cited tells you what a claim actually means.",
  quickWhatNext:
    "Watch monthly price data, wage growth relative to prices, and Federal Reserve interest-rate decisions — those three together describe most of what people mean by 'the economy.'",
  body: [
    {
      heading: "A speed, not a height",
      paragraphs: [
        "Imagine a car. Inflation is the speedometer: it tells you how fast prices are rising. The price level is the odometer: it tells you how far they have already traveled.",
        "Slowing down the car does not move it backwards. When news reports say inflation cooled, they mean the speedometer dropped — not that the odometer reset.",
        "For prices to actually fall you would need deflation, which sounds appealing and is generally considered a serious economic problem, because it tends to accompany falling wages and rising unemployment.",
      ],
    },
    {
      heading: "Why the numbers and your experience disagree",
      paragraphs: [
        "Official inflation measures track a broad basket of goods and services — housing, transportation, food, medical care, recreation and more. Your personal inflation rate depends on what you actually buy.",
        "If your budget is dominated by rent, gas and groceries, and those categories rose faster than the average, your experience will be worse than the headline number even when the headline number is accurate.",
        "Neither is lying. They are measuring different things.",
      ],
      bullets: [
        "The Consumer Price Index is produced by the Bureau of Labor Statistics and tracks a weighted basket of consumer goods and services.",
        "Core inflation excludes food and energy, because those categories swing sharply for reasons unrelated to the broader economy.",
        "Real wages compare pay growth to price growth. If wages rise faster than prices, purchasing power increases.",
      ],
    },
    {
      heading: "Who actually controls prices",
      paragraphs: [
        "This is where the politics enter. Presidents are held responsible for prices, but the main policy lever sits elsewhere.",
        "The Federal Reserve — the central bank — sets short-term interest rates, which influence borrowing costs across the economy. Raising rates is intended to slow spending and cool price growth; lowering rates is intended to encourage borrowing and activity.",
        "The Fed is deliberately structured to be insulated from day-to-day politics. Presidents nominate governors and the Senate confirms them, but the president does not set interest rates.",
        "Congress and the president do influence the economy through taxes and spending — fiscal policy — and through trade, energy and regulatory decisions. The debate is about how much those choices matter relative to global forces like supply chains and energy markets.",
      ],
    },
    {
      heading: "How to read an economic claim",
      paragraphs: [
        "When you hear a political claim about prices, three questions do most of the work. Is the speaker citing a rate or a level? Over what time period? And compared to what baseline?",
        "A statement can be technically accurate and still misleading if the baseline was chosen to flatter the argument. This is true of claims made by every side.",
        "The most useful habit is to look for the same statistic measured the same way across several years, rather than a single comparison chosen by whoever is talking.",
      ],
    },
  ],
  democraticView: {
    label: "Many Democratic officials",
    summary:
      "A common framing among Democratic lawmakers emphasizes wage growth, employment, and targeted relief for specific high-cost categories.",
    points: [
      "Often point to job growth and rising wages as evidence that household finances are improving even while prices remain elevated.",
      "Frequently support direct interventions in specific markets — for example, capping certain prescription drug costs or expanding housing supply subsidies.",
      "Some argue that corporate pricing behavior contributed to price increases, a claim economists debate.",
    ],
  },
  republicanView: {
    label: "Many Republican officials",
    summary:
      "A common framing among Republican lawmakers emphasizes the cumulative price level, federal spending, and energy production costs.",
    points: [
      "Argue that large federal spending packages added demand to an economy with constrained supply, contributing to price increases.",
      "Frequently favor expanded domestic energy production as a way to lower input costs across the economy.",
      "Generally emphasize deregulation and tax reduction as the route to growth rather than targeted spending programs.",
    ],
  },
  otherViews: [
    {
      label: "Economists across the spectrum",
      summary:
        "Professional economists disagree with each other about causes, and that disagreement is genuine rather than partisan theater.",
      points: [
        "Most analyses attribute the price surge of the early 2020s to a combination of pandemic supply disruptions, shifts in consumer demand, energy market shocks and fiscal support — with real disagreement about the weight of each.",
        "There is broad agreement that monetary policy affects inflation with a lag, meaning today's rate decisions show up in prices months later.",
      ],
    },
    {
      label: "Younger households specifically",
      summary:
        "Analysts who study age cohorts note that the inflation experience is not evenly distributed.",
      points: [
        "Housing costs weigh more heavily on renters, who skew younger, than on households with fixed mortgages.",
        "First-time buyers face both higher prices and higher borrowing costs at the same time, which compounds the effect.",
      ],
    },
  ],
  knownFacts: [
    "Inflation measures the rate of change in prices over a period of time, not the price level itself.",
    "The Consumer Price Index is published monthly by the Bureau of Labor Statistics.",
    "Core inflation excludes food and energy prices because of their volatility.",
    "The Federal Reserve sets short-term interest rates and is structured to operate independently of the executive branch.",
    "Deflation — a sustained fall in the general price level — is generally treated by economists as a warning sign rather than a goal.",
  ],
  uncertainties: [
    "Economists continue to disagree about how much of the early-2020s price surge came from supply disruption versus demand support.",
    "The lag between interest-rate changes and their full effect on prices is not precisely known and varies by cycle.",
    "How much any single federal policy moves consumer prices is difficult to isolate from global conditions.",
  ],
  keyTerms: [
    {
      term: "Inflation",
      definition:
        "The rate at which the general level of prices is rising over time, usually stated as a yearly percentage.",
    },
    {
      term: "Consumer Price Index (CPI)",
      definition:
        "A monthly measure of the average change in prices paid by urban consumers for a basket of goods and services.",
    },
    {
      term: "Real wages",
      definition:
        "Wages adjusted for inflation. If real wages rise, pay is growing faster than prices.",
    },
    {
      term: "Federal Reserve",
      definition:
        "The central bank of the United States. It sets short-term interest rates to pursue stable prices and maximum employment.",
    },
    {
      term: "Fiscal policy",
      definition:
        "Government decisions about taxing and spending, made by Congress and the president — separate from the Fed's monetary policy.",
    },
  ],
  sources: [
    {
      id: "src-bls-cpi",
      publisher: "Bureau of Labor Statistics",
      title: "Consumer Price Index — monthly release and methodology",
      date: "Monthly",
      url: "#",
      kind: "data",
      isPlaceholder: true,
    },
    {
      id: "src-fed-statement",
      publisher: "Federal Reserve",
      title: "FOMC statements and Summary of Economic Projections",
      date: "Eight times per year",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
    {
      id: "src-bea",
      publisher: "Bureau of Economic Analysis",
      title: "Personal Consumption Expenditures price index",
      date: "Monthly",
      url: "#",
      kind: "data",
      isPlaceholder: true,
    },
  ],
  authorId: "sam-reyes",
  type: "explainer",
  status: "published",
  publishedAt: "2026-08-27T08:05:00.000Z",
  updatedAt: "2026-08-27T08:05:00.000Z",
  readTime: 5,
  cover: { pattern: "ridge", hue: 60 },
  featured: false,
  significance: 88,
  isDemo: true,
};

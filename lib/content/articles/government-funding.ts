import type { Article } from "@/types/ngn";

export const governmentFunding: Article = {
  id: "art-government-funding",
  slug: "government-funding-deadline-explained",
  headline:
    "Why the Government Funding Deadline Keeps Coming Back — and What Happens If Congress Misses It",
  subheadline:
    "Federal agencies only have permission to spend money for a set period of time. When that period ends, Congress has to act again. Here is the machinery behind a fight you have probably heard adults arguing about.",
  summary:
    "Congress has to pass funding legislation on a recurring deadline or agencies lose their legal authority to spend. The deadline creates leverage, which is why unrelated political fights get attached to it.",
  inTwentySeconds:
    "The federal government cannot spend money unless Congress says so, and that permission expires. Each year lawmakers are supposed to pass twelve funding bills before the fiscal year starts on October 1. They almost never finish on time, so they pass short-term extensions instead — which creates a new deadline, which creates new leverage, which is why funding fights so often end up being about something else entirely.",
  category: "congress",
  issueSlugs: ["economy", "taxes"],
  quickWhatHappened:
    "Federal spending authority runs on deadlines set by Congress. As each deadline approaches, lawmakers must pass new funding legislation, extend the old level temporarily, or let agency funding lapse.",
  quickWhyItMatters:
    "A lapse pauses services people actually use — passport processing, park operations, some federal loan programs — and federal workers are affected directly. The deadline also gives whichever group is willing to say no unusual bargaining power over unrelated policy.",
  quickWhatNext:
    "Watch for three signals: whether leadership schedules a vote on full-year bills or another short-term extension, whether the Senate has the votes to end debate, and whether any policy conditions get attached to the funding text.",
  body: [
    {
      heading: "Start with the part nobody explains",
      paragraphs: [
        "The federal government is not like a household with a bank account it can draw from whenever it wants. Under the Constitution, money can only leave the Treasury if Congress has passed a law allowing it. That law is called an appropriation.",
        "Appropriations expire. Most of them cover a single fiscal year, which for the federal government runs from October 1 to September 30. When the clock runs out, the legal permission to spend runs out with it — not because the money is gone, but because the authorization is.",
        "So every year, Congress has to do the same chore again. That chore is the source of the fight.",
      ],
    },
    {
      heading: "The twelve bills almost nobody passes on time",
      paragraphs: [
        "In theory, the House and Senate Appropriations Committees write twelve separate bills, each covering a slice of the government — defense, agriculture, transportation and housing, and so on. Each chamber passes them, the two versions get reconciled, and the president signs them before October 1.",
        "In practice, that full process is rarely completed on schedule. The bills are enormous, the two chambers are often controlled by different parties or different factions, and every line is a policy decision somebody wants to litigate.",
      ],
      bullets: [
        "When Congress runs out of time, it passes a continuing resolution — a stopgap that generally keeps agencies running at existing funding levels for a set number of days or weeks.",
        "When it wants to finish several bills at once, it packages them into an omnibus or a smaller minibus.",
        "Roughly two-thirds of federal spending never goes through this process at all. Programs like Social Security and Medicare are mandatory spending, funded by standing law rather than annual appropriations.",
      ],
    },
    {
      heading: "Why a deadline becomes a weapon",
      paragraphs: [
        "Here is the part that makes the politics click. A deadline with real consequences creates leverage for anyone willing to withhold their vote.",
        "If a bill must pass, and if it cannot pass without a particular bloc of members, then that bloc can attach conditions. Those conditions frequently have nothing to do with the underlying spending — they might involve immigration enforcement, environmental rules, or aid to another country.",
        "This is not a party-specific tactic. Members of both parties have used funding deadlines to extract policy concessions, and members of both parties have condemned the tactic when it was used against them.",
      ],
    },
    {
      heading: "The Senate math that shapes everything",
      paragraphs: [
        "One structural fact explains a lot of the drama: in the Senate, ending debate on most legislation requires 60 votes out of 100, not a simple majority. That threshold is called cloture, and the practice of blocking a vote by refusing to allow debate to end is the filibuster.",
        "Because neither party has held 60 seats in many years, funding bills generally need votes from both parties to reach the floor. That makes a purely party-line funding bill very difficult to pass, no matter who controls which chamber.",
        "It also means the loudest voices in a fight are not always the decisive ones. The decisive ones are usually whoever can supply the last few votes.",
      ],
    },
    {
      heading: "What a funding lapse actually does",
      paragraphs: [
        "If appropriations lapse, agencies must follow a law called the Antideficiency Act, which broadly prohibits spending money that Congress has not appropriated. Agencies keep working only where the law allows exceptions — for example, activities that protect life and property.",
        "Everything else pauses. Employees deemed non-excepted are furloughed, meaning they are told not to come to work. Excepted employees keep working during the lapse.",
        "The effects are uneven, which is part of why the politics are hard to predict. Some people notice immediately. Many notice nothing for days. That gap between real disruption and visible disruption is exactly what each side is trying to shape when they talk about who is to blame.",
      ],
    },
    {
      heading: "How to follow it without getting spun",
      paragraphs: [
        "Coverage of funding fights is heavy on blame and light on mechanics. A few questions cut through most of it: What is the actual deadline? Is the proposal a full-year bill or a short-term extension? What policy conditions, if any, are attached to the text? And does the plan have a realistic path to 60 votes in the Senate?",
        "If a story does not answer those four questions, it is describing the argument rather than the decision.",
      ],
    },
  ],
  democraticView: {
    label: "Many Democratic lawmakers",
    summary:
      "A common position among Democratic leaders is that funding legislation should be passed cleanly — without policy conditions attached — and that spending levels for domestic programs should keep pace with costs.",
    points: [
      "Argue that attaching unrelated policy demands to a must-pass bill turns a routine obligation into a hostage negotiation.",
      "Generally push for higher funding levels for non-defense domestic programs such as education, housing assistance and public health.",
      "Often emphasize the direct costs of a lapse on federal workers and on people who rely on federal services.",
    ],
  },
  republicanView: {
    label: "Many Republican lawmakers",
    summary:
      "A common position among Republican leaders is that annual funding is one of the few moments Congress can actually restrain federal spending, and that the deadline is a legitimate point of leverage.",
    points: [
      "Argue that federal spending growth and the national debt require limits, and that appropriations bills are the practical tool for setting them.",
      "Often seek policy conditions in funding text, particularly on border enforcement and on regulations they view as costly.",
      "Frequently favor returning to the regular twelve-bill process, arguing that large last-minute packages reduce scrutiny of individual line items.",
    ],
  },
  otherViews: [
    {
      label: "Budget process reformers",
      summary:
        "Analysts across the ideological spectrum argue that the recurring crisis is a design problem, not a personality problem.",
      points: [
        "Proposals include automatic continuing resolutions that would take effect if Congress misses a deadline, removing the shutdown threat entirely.",
        "Others propose two-year budget cycles, arguing that the annual timeline is unrealistic for a government of this size.",
        "Critics of these reforms counter that removing the deadline pressure would make Congress even less likely to finish its work.",
      ],
    },
    {
      label: "Federal employee organizations",
      summary:
        "Groups representing the federal workforce focus less on the spending totals and more on the disruption itself.",
      points: [
        "Argue that repeated funding uncertainty makes federal agencies harder to staff and retain workers.",
        "Note that contractors, unlike federal employees, have historically had no guarantee of back pay after a lapse.",
      ],
    },
  ],
  knownFacts: [
    "Under the Constitution, federal money may only be spent pursuant to an appropriation made by law.",
    "The federal fiscal year begins on October 1 and ends on September 30.",
    "Congress is responsible for twelve regular annual appropriations bills.",
    "A continuing resolution extends funding, generally at existing levels, for a defined period.",
    "Ending debate on most Senate legislation requires 60 votes.",
    "Mandatory programs such as Social Security are funded through standing law rather than annual appropriations.",
  ],
  uncertainties: [
    "Whether any given deadline ends in a full-year deal, another short-term extension, or a lapse is a political judgment, not a predictable outcome.",
    "The economic effect of a lapse depends heavily on its length, and estimates vary widely between forecasters.",
    "Public opinion about who is responsible for a lapse tends to shift during the event itself, so early polling is a weak predictor.",
  ],
  keyTerms: [
    {
      term: "Appropriation",
      definition:
        "A law that gives a federal agency legal permission to spend a specific amount of money for a specific purpose.",
    },
    {
      term: "Continuing resolution (CR)",
      definition:
        "A temporary funding law that extends existing spending levels so agencies can keep operating past a deadline.",
    },
    {
      term: "Omnibus",
      definition:
        "A single large bill that combines many appropriations bills into one vote.",
    },
    {
      term: "Cloture",
      definition:
        "The Senate procedure for ending debate on a measure. It generally requires 60 votes.",
    },
    {
      term: "Discretionary vs. mandatory spending",
      definition:
        "Discretionary spending is set each year through appropriations. Mandatory spending is set by standing law and continues without an annual vote.",
    },
  ],
  sources: [
    {
      id: "src-cbo-outlook",
      publisher: "Congressional Budget Office",
      title: "The Budget and Economic Outlook (annual report series)",
      date: "Annual",
      url: "#",
      kind: "data",
      isPlaceholder: true,
    },
    {
      id: "src-crs-approps",
      publisher: "Congressional Research Service",
      title: "Introduction to the Federal Budget Process (report series)",
      date: "Updated periodically",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
    {
      id: "src-gao-antideficiency",
      publisher: "U.S. Government Accountability Office",
      title: "Antideficiency Act resources and appropriations law guidance",
      date: "Updated periodically",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
    {
      id: "src-senate-cloture",
      publisher: "U.S. Senate",
      title: "Cloture and the filibuster: procedural reference",
      date: "Reference",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
  ],
  authorId: "dev-anand",
  type: "news",
  status: "published",
  publishedAt: "2026-08-27T11:15:00.000Z",
  updatedAt: "2026-08-27T11:15:00.000Z",
  readTime: 7,
  cover: { pattern: "column", hue: 285 },
  featured: true,
  significance: 98,
  isDemo: true,
};

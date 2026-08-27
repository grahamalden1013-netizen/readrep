import type { WeeklyArticle } from "@/types/ngn";

/**
 * The NGN Weekly — one longer editor's article each week.
 *
 * These are clearly labelled opinion. They are written by a named editor and
 * are never presented as neutral news coverage.
 */
export const WEEKLY_ARTICLES: WeeklyArticle[] = [
  {
    id: "wk-014",
    slug: "the-most-political-thing-you-can-do-is-slow-down",
    edition: 14,
    headline: "The Most Political Thing You Can Do Is Slow Down",
    dek: "Speed is the product being sold to you. Understanding is the thing you actually wanted.",
    summary:
      "An argument that the pace of political information — not its bias — is the main obstacle to understanding it, and what to do about that as a reader.",
    authorId: "nora-halloway",
    publishedAt: "2026-08-25T07:00:00.000Z",
    readTime: 8,
    cover: { pattern: "wave", hue: 40 },
    featured: true,
    isDemo: true,
    body: [
      {
        heading: "A confession about how this newsroom works",
        paragraphs: [
          "When something happens in politics, the first version you hear is almost always wrong in some detail. Not because anyone lied, but because the first version is assembled from incomplete information under time pressure, and time pressure is the one variable nobody wants to spend.",
          "We built NGN around a slightly embarrassing admission: most of what makes political news hard to follow is not bias. It is speed. By the time a story is explained well enough to understand, the audience has already moved on to being angry about the next one.",
          "That is not a moral failure on your part. It is the design of the system you are reading inside.",
        ],
      },
      {
        heading: "What actually confuses people",
        paragraphs: [
          "Spend enough time asking high schoolers what they find hard about political news, and you stop hearing what adults expect to hear. Almost nobody says the articles are too biased. What they say is that everyone seems to already know something they were never told.",
          "They were never told that a bill has to pass two chambers. That most Senate legislation needs sixty votes, not fifty-one. That a court can rule on a case without deciding the question everyone was arguing about. That inflation going down does not mean prices going down.",
          "None of these are secrets. They are just assumed. And an assumption you were never taught is functionally identical to a lie of omission — it leaves you unable to evaluate what you are being told.",
        ],
      },
      {
        heading: "Neutrality is not the absence of a position",
        paragraphs: [
          "There is a version of neutrality that is really just cowardice: describing every disagreement as two equal shouting sides and declining to say anything true about either.",
          "That is not what we are attempting. Our commitment is narrower and, I think, more demanding. We will tell you what is established. We will tell you what is contested and by whom. We will represent the strongest version of each major position rather than the most embarrassing one. And we will not tell you which one to hold.",
          "That last part is the discipline. It is genuinely tempting, when you understand a policy well, to also tell people what to conclude about it. We think that trade is bad for you. If we hand you conclusions, you learn our conclusions. If we hand you the structure, you can generate your own — and revise them later, which is the part that actually matters.",
        ],
      },
      {
        heading: "The parties are not two people",
        paragraphs: [
          "One habit we try to enforce on ourselves: never write the sentence 'Democrats believe' or 'Republicans believe.'",
          "Neither party is a person with beliefs. Each is a coalition — of elected officials, primary voters, general election voters, donors, activists and interest groups — that disagrees with itself constantly. The disagreements inside a party are frequently sharper than the disagreements between them, and they are almost never covered, because internal disagreement makes a worse story than a clean fight.",
          "So we write 'many Democratic lawmakers argue' and 'a common position among Republican leaders is,' and we make room for the internal splits. It is clunkier. It is also true.",
        ],
      },
      {
        heading: "What we are asking of you",
        paragraphs: [
          "Not much, honestly. Three things.",
          "First: when you encounter a claim that makes you feel something immediately, that is the moment to slow down rather than share. The strength of the feeling is uncorrelated with the accuracy of the claim, and often inversely related.",
          "Second: get comfortable saying you do not know yet. In a political environment that rewards instant certainty, the ability to hold a question open is a genuine skill and it is rarer than it should be.",
          "Third: when you disagree with someone, argue with the strongest version of what they said. Not because it is polite, but because arguing with a weak version teaches you nothing and convinces no one.",
        ],
      },
      {
        heading: "Why we think this is worth doing",
        paragraphs: [
          "There is a widespread assumption that young people are disengaged from politics. What we have found is closer to the opposite: a lot of people who care and have concluded, reasonably, that the available ways of following it are exhausting and dishonest.",
          "That is a solvable problem. Not by making politics entertaining, which is how we got here, but by making it legible.",
          "Understand what is happening. Decide what you think. In that order, and with as much time as you need for the second part.",
        ],
      },
    ],
  },
  {
    id: "wk-013",
    slug: "your-feed-is-not-the-country",
    edition: 13,
    headline: "Your Feed Is Not the Country",
    dek: "Every recommendation system is a poll with a broken sample. Here is how to read one anyway.",
    summary:
      "On why the political world visible through an algorithmic feed systematically misrepresents public opinion — in every direction at once.",
    authorId: "nora-halloway",
    publishedAt: "2026-08-18T07:00:00.000Z",
    readTime: 6,
    cover: { pattern: "orbit", hue: 220 },
    featured: false,
    isDemo: true,
    body: [
      {
        heading: "The sample problem",
        paragraphs: [
          "If you wanted to know what a country thinks, you would want a random sample. A feed is the opposite of that: it is a sample selected for your attention, drawn from people who post, weighted toward posts that generate response.",
          "People who post about politics are not representative of people who have political opinions. Posts that generate response are not representative of posts. Multiply those two filters together and you get a picture of the electorate that is wrong in a specific, predictable direction: it overstates intensity and understates ambivalence.",
        ],
      },
      {
        heading: "Both sides get the same distortion",
        paragraphs: [
          "This is not a claim that one political side lives in a bubble and the other does not. The mechanism is identical regardless of which direction your feed leans.",
          "The most common real-world position on most issues is some version of 'it depends, and I have not thought about it that hard.' That position generates no engagement whatsoever, so it is invisible online — which is why people are consistently surprised by election results, ballot measure outcomes and their own relatives.",
        ],
      },
      {
        heading: "What to do about it",
        paragraphs: [
          "Read polling, carefully, from organizations that publish their methodology. Notice the margin of error and the question wording, because question wording moves results more than most people expect.",
          "And treat anything you learned from a feed as a hypothesis about the world rather than a description of it. That is a small adjustment. It changes a surprising amount.",
        ],
      },
    ],
  },
  {
    id: "wk-012",
    slug: "nobody-is-coming-to-explain-it-to-you",
    edition: 12,
    headline: "Nobody Is Coming to Explain It to You",
    dek: "Civics class ended in ninth grade. The government did not.",
    summary:
      "On the gap between when students are taught how government works and when they actually need to know, and who fills it.",
    authorId: "nora-halloway",
    publishedAt: "2026-08-11T07:00:00.000Z",
    readTime: 6,
    cover: { pattern: "column", hue: 30 },
    featured: false,
    isDemo: true,
    body: [
      {
        heading: "The timing problem",
        paragraphs: [
          "Most American students take a government or civics course years before they can vote, and years before any policy decision visibly affects their life. Then the instruction stops, and the assumption is that news coverage takes over.",
          "News coverage does not take over. Political journalism is written for people who already follow politics, which is a small and unusual group. Its conventions — the horse race framing, the assumed knowledge, the acronyms — make sense only if you were already there yesterday.",
        ],
      },
      {
        heading: "What fills the gap",
        paragraphs: [
          "Something always fills an explanatory vacuum. Right now it is largely filled by people whose incentive is engagement rather than accuracy, and who are extremely good at their jobs.",
          "The answer is not to tell young people to try harder. It is to write the thing that should have existed: explanation that does not condescend, does not assume, and does not sell you a conclusion at the end.",
        ],
      },
    ],
  },
  {
    id: "wk-011",
    slug: "why-we-dont-do-hot-takes",
    edition: 11,
    headline: "Why We Don't Do Hot Takes",
    dek: "An editorial policy, stated plainly, so you can hold us to it.",
    summary:
      "The editorial standards behind NGN: what we publish, what we refuse to publish, and how to tell us we got it wrong.",
    authorId: "nora-halloway",
    publishedAt: "2026-08-04T07:00:00.000Z",
    readTime: 5,
    cover: { pattern: "ridge", hue: 50 },
    featured: false,
    isDemo: true,
    body: [
      {
        heading: "The rules we work under",
        paragraphs: [
          "Fact, analysis and opinion are labelled separately and never blended inside a paragraph. If you are reading an opinion, it says so at the top and it has a name attached.",
          "We cite sources, and we prefer primary documents — the bill text, the opinion, the agency rule — over descriptions of them. When we are uncertain, we say so in a section titled exactly that.",
        ],
      },
      {
        heading: "What we will not do",
        paragraphs: [
          "We do not run outrage. We do not rank stories by how much attention they got. We do not have an angry reaction button, because we do not want a product that measures its success in anger.",
          "And we do not publish an AI-generated article without a human editor reading every line of it. That is a hard rule, not a preference.",
        ],
      },
    ],
  },
];

import type { Comment, ReactionTally } from "@/types/ngn";

/**
 * Article comments — labelled "Student Voices" in the interface.
 * Every record carries a moderation status so the review pipeline is visible
 * in the data model from day one.
 */
export const COMMENTS: Comment[] = [
  {
    id: "c-1",
    articleId: "art-government-funding",
    parentId: null,
    author: {
      username: "quietcivics",
      displayName: "Priya R.",
      gradeLabel: "12th grade",
      hue: 280,
    },
    body: "The part I never understood until now is why unrelated stuff gets attached to funding bills. It's not random — it's that a must-pass bill is the only reliable vehicle. That single sentence explained about four years of headlines for me.",
    createdAt: "2026-08-27T13:40:00.000Z",
    likes: 34,
    status: "approved",
    replies: [
      {
        id: "c-1-1",
        articleId: "art-government-funding",
        parentId: "c-1",
        author: {
          username: "m_torres",
          displayName: "Marcus T.",
          gradeLabel: "11th grade",
          hue: 130,
        },
        body: "Same. Though I'd push back slightly on the framing that it's just leverage — sometimes the attached policy genuinely can't pass on its own because it's unpopular, and that's a different problem than hostage-taking.",
        createdAt: "2026-08-27T14:15:00.000Z",
        likes: 12,
        status: "approved",
        replies: [],
      },
    ],
  },
  {
    id: "c-2",
    articleId: "art-government-funding",
    parentId: null,
    author: {
      username: "deladams",
      displayName: "Del A.",
      gradeLabel: "College first year",
      hue: 40,
    },
    body: "Question for anyone who knows more: if two-thirds of spending is mandatory and doesn't go through this process, then how much of the deficit argument is even about the bills they're fighting over? Genuinely asking, not making a point.",
    createdAt: "2026-08-27T15:02:00.000Z",
    likes: 27,
    status: "approved",
    replies: [],
  },
  {
    id: "c-3",
    articleId: "art-prices",
    parentId: null,
    author: {
      username: "ellis_j",
      displayName: "Ellis J.",
      gradeLabel: "College first year",
      hue: 200,
    },
    body: "The speedometer/odometer thing is the clearest version of this I've read. I've had three separate arguments with family where we were both right and just talking about different measurements.",
    createdAt: "2026-08-27T12:20:00.000Z",
    likes: 41,
    status: "approved",
    replies: [],
  },
  {
    id: "c-4",
    articleId: "art-phones-schools",
    parentId: null,
    author: {
      username: "sara_l",
      displayName: "Sara L.",
      gradeLabel: "11th grade",
      hue: 260,
    },
    body: "Appreciate that this said the research is unsettled instead of picking whichever study supported a conclusion. Most coverage of this issue does the opposite.",
    createdAt: "2026-08-26T18:35:00.000Z",
    likes: 30,
    status: "approved",
    replies: [],
  },
  {
    id: "c-5",
    articleId: "art-online-speech",
    parentId: null,
    author: {
      username: "kai_m",
      displayName: "Kai M.",
      gradeLabel: "12th grade",
      hue: 230,
    },
    body: "I came in thinking this was a censorship story and left understanding it's mostly a question about who counts as the speaker. That reframing was worth the six minutes.",
    createdAt: "2026-08-27T10:50:00.000Z",
    likes: 22,
    status: "approved",
    replies: [],
  },
];

/** Demo reaction counts. There is deliberately no angry reaction. */
export const REACTIONS: Record<string, ReactionTally> = {
  "art-government-funding": { learned: 312, interesting: 148, agree: 61, disagree: 23 },
  "art-online-speech": { learned: 204, interesting: 119, agree: 44, disagree: 38 },
  "art-prices": { learned: 388, interesting: 96, agree: 72, disagree: 15 },
  "art-phones-schools": { learned: 176, interesting: 141, agree: 88, disagree: 64 },
  "art-immigration-anatomy": { learned: 241, interesting: 103, agree: 39, disagree: 41 },
  "art-ai-rules": { learned: 168, interesting: 127, agree: 46, disagree: 19 },
  "art-redistricting": { learned: 289, interesting: 94, agree: 55, disagree: 12 },
  "art-vehicle-rules": { learned: 143, interesting: 87, agree: 33, disagree: 29 },
  "art-foreign-powers": { learned: 157, interesting: 78, agree: 30, disagree: 18 },
  "art-health-costs": { learned: 262, interesting: 91, agree: 67, disagree: 21 },
};

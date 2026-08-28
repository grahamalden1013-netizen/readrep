import type { Discussion } from "@/types/ngn";

/**
 * DEMO CONTENT — see `data/demo/README.md`.
 *
 * Discuss is deliberately the slow room. There is one reaction — "Made me
 * think" — and no downvote, no ratio, no reply count leaderboard. Every seeded
 * response models the behaviour the product is trying to teach.
 */

export const DISCUSSIONS: Discussion[] = [
  {
    id: "dsc-1",
    slug: "changed-your-mind",
    question: "What is something you changed your mind about, and what actually changed it?",
    context:
      "Not a debate. We are interested in the mechanism — what kind of argument or evidence has ever moved you, and what that suggests about how to persuade anyone else.",
    responses: [
      {
        id: "r1",
        author: "steelman_sam",
        division: "Master",
        body: "I used to think anyone who disagreed with me on housing policy just hadn't looked at the numbers. What changed it was a Switch Sides exercise where I had to argue against upzoning and actually read what neighbourhood groups were worried about. Most of it wasn't about property values at all. I still disagree with them, but I was arguing against a version of their position that nobody held.",
        madeMeThink: 47,
        postedAt: "2 days ago",
        moderation: "approved",
      },
      {
        id: "r2",
        author: "warrant_check",
        division: "Diamond",
        body: "Honestly, a person rather than an argument. My uncle and I disagree about basically everything political and we talk every week anyway. At some point I stopped being able to think of people who hold his views as stupid, because he isn't. That didn't change my positions but it changed how confident I am that I understand why anyone holds theirs.",
        madeMeThink: 39,
        postedAt: "2 days ago",
        moderation: "approved",
      },
      {
        id: "r3",
        author: "ledger_and_line",
        division: "Platinum",
        body: "A number, weirdly. I assumed the federal minimum wage had gone up at some point in my lifetime. It hasn't since 2009. Finding that out didn't tell me what the right level is, but it made me realise I had been arguing about the level while assuming a fact that was wrong. Now I try to check the boring background facts first.",
        madeMeThink: 52,
        postedAt: "1 day ago",
        moderation: "approved",
      },
    ],
  },
  {
    id: "dsc-2",
    slug: "strongest-opposing-argument",
    question: "What is the strongest argument against a position you hold?",
    context:
      "State it as well as you can, without rebutting it. If you find yourself adding 'but of course that's wrong', you have not finished the exercise.",
    relatedDebateSlug: "voting-age-16",
    responses: [
      {
        id: "r4",
        author: "granting_that",
        division: "Platinum",
        body: "I support lowering the voting age. The strongest argument against it is the dependence argument: a 16-year-old living at home, financially dependent, filling in a mail ballot at the kitchen table is in a genuinely different position from an adult who can close a door. That is not a claim that teenagers are incapable. It is a claim about the conditions independent judgment requires, and I don't have a clean answer to it.",
        madeMeThink: 61,
        postedAt: "3 days ago",
        moderation: "approved",
      },
      {
        id: "r5",
        author: "marginalia",
        division: "Master",
        body: "I think the Electoral College should go. The strongest case for keeping it is the recount one. Right now a disputed election is contained in one state with one set of rules. Under a national popular vote, a margin of a few thousand puts every precinct in the country in play under fifty different recount laws, and there is no national body that could run that. We would need to build the institution before we changed the rule, and nobody proposing the change is proposing to build it.",
        madeMeThink: 58,
        postedAt: "3 days ago",
        moderation: "approved",
      },
    ],
  },
  {
    id: "dsc-3",
    slug: "what-would-change-your-mind",
    question: "On the issue you feel most strongly about: what evidence would change your mind?",
    context:
      "If the honest answer is 'nothing', that is worth saying too — and worth examining. A position no evidence could touch is a different kind of thing from a position evidence supports.",
    relatedArticleSlug: "the-wage-floor",
    responses: [
      {
        id: "r6",
        author: "footnote_kid",
        division: "Diamond",
        body: "I support raising the minimum wage. What would move me: credible studies of increases well above the ranges we have already tested, showing sustained reductions in hours for the lowest-paid workers specifically. Not headcount — hours. Most of the research I trust says the employment effect near current levels is small, and I notice that is the level that has actually been tried. I should not assume it holds at a level nobody has tried.",
        madeMeThink: 44,
        postedAt: "4 days ago",
        moderation: "approved",
      },
      {
        id: "r7",
        author: "the_third_option",
        division: "Diamond",
        body: "I said 'nothing' at first and then sat with it, which was uncomfortable. I think the honest version is that on some questions my position rests on a value rather than a fact, and no evidence changes a value. What evidence can do is change what I think the value implies. That feels like a real distinction rather than a dodge, but I would take a rebuttal on it.",
        madeMeThink: 67,
        postedAt: "4 days ago",
        moderation: "approved",
      },
    ],
  },
];

export const DISCUSSION_BY_SLUG = new Map(DISCUSSIONS.map((d) => [d.slug, d]));

export function getDiscussion(slug: string): Discussion | undefined {
  return DISCUSSION_BY_SLUG.get(slug);
}

/** Shown above the composer, every time, before anyone posts. */
export const DISCUSSION_PLEDGE = "Challenge ideas, not people.";

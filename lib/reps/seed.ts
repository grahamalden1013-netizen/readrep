import { gameSchema, repSchema, type Game, type Rep } from "./schema";

export const DEMO_GAME_ID = "demo-dragons";

/**
 * A rep's clip stops this long before the next possession begins. The gap is
 * the editor's cut: without it the final frame of a clip is the first frame of
 * the next possession, so the reveal would show the wrong play.
 */
export const CUT_GAP_MS = 600;

/**
 * The demo film is an animated re-creation, not real tape. Every rep timestamp
 * below lines up with action that actually happens in that video — the film is
 * rendered from the same timings by `scripts/demo-film/render.mjs`.
 */
export const DEMO_GAME: Game = gameSchema.parse({
  id: DEMO_GAME_ID,
  title: "Saturday vs. Dragons",
  opponent: "Dragons",
  playedOn: "2026-02-14",
  identity: {
    jerseyNumber: "22",
    teamColor: "White",
    marker: "White leg sleeves",
  },
  video: {
    kind: "progressive",
    encodings: [
      { src: "/demo/dragons-film.webm", type: 'video/webm; codecs="vp9"' },
      { src: "/demo/dragons-film.mp4", type: 'video/mp4; codecs="avc1.42E01E"' },
    ],
    posterSrc: "/demo/dragons-film-poster.png",
    captionsSrc: "/demo/dragons-film.vtt",
    disclaimer: "Demo film — animated re-creation, not real game footage.",
  },
  videoAsset: null,
  origin: "demo",
  createdAt: "2026-02-14T21:30:00.000Z",
});

const rawReps = [
  {
    id: "demo-rep-1",
    gameId: DEMO_GAME_ID,
    order: 1,
    title: "The low man digs",
    category: "help-recognition",
    difficulty: "medium",
    clipStartMs: 0,
    decisionPauseMs: 13000,
    clipEndMs: 21400,
    situation: "Second quarter. Ball swings to you on the right wing off a post entry look.",
    prompt:
      "You're #22 on the right wing. Their low defender has left the corner to dig at the post. What's your best read?",
    choices: [
      { id: "a", label: "Attack the rim off the catch" },
      { id: "b", label: "Skip pass to the weak-side corner" },
      { id: "c", label: "Reset the ball to the top" },
      { id: "d", label: "Feed the post anyway" },
    ],
    correctChoiceId: "b",
    actualChoiceId: "d",
    actualOutcome: "Forced the post entry into two defenders — deflected out of bounds.",
    explanation:
      "Their low man left the corner to dig. The moment he steps in, that corner shooter is the open man, and he is open for about one second. Skip it before the top defender can sink and take it away. Feeding the post after the dig is throwing into a crowd you can already see.",
    coachingCue: "Low man digs, the corner is open. Skip it.",
  },
  {
    id: "demo-rep-2",
    gameId: DEMO_GAME_ID,
    order: 2,
    title: "Hard closeout, high hands",
    category: "closeout-attack",
    difficulty: "easy",
    clipStartMs: 22000,
    decisionPauseMs: 34000,
    clipEndMs: 43400,
    situation: "Ball reversal finds you spotted up on the left wing with a defender in full sprint.",
    prompt:
      "Your defender is closing out hard with high hands and his weight going forward. What's your best read?",
    choices: [
      { id: "a", label: "Rise up and shoot over him" },
      { id: "b", label: "Rip through and drive the closeout" },
      { id: "c", label: "Swing it back to the top" },
      { id: "d", label: "Pump fake and hold the ball" },
    ],
    correctChoiceId: "b",
    actualChoiceId: "a",
    actualOutcome: "Shot over the contest — long rebound, Dragons pushed the other way.",
    explanation:
      "A hard closeout with high hands means his feet are behind his hands. One rip-through and you are past his top shoulder with a live dribble and the nearest help two steps away. Shooting into a contest you can see coming is the worst half of that read.",
    coachingCue: "High hands, rip past the top shoulder.",
  },
  {
    id: "demo-rep-3",
    gameId: DEMO_GAME_ID,
    order: 3,
    title: "Three-on-two in the open floor",
    category: "transition-decision",
    difficulty: "easy",
    clipStartMs: 44000,
    decisionPauseMs: 57000,
    clipEndMs: 67400,
    situation: "Live-ball steal. You push it with a runner in each lane and only two defenders back.",
    prompt:
      "Three-on-two, and both defenders have sunk to the rim. What's your best read?",
    choices: [
      { id: "a", label: "Attack all the way into both defenders" },
      { id: "b", label: "Stop at the free-throw line and make the top defender commit" },
      { id: "c", label: "Pull it out and set up the offense" },
      { id: "d", label: "Throw ahead to the right lane before the arc" },
    ],
    correctChoiceId: "b",
    actualChoiceId: "a",
    actualOutcome: "Drove into both defenders — charge called.",
    explanation:
      "Three-on-two, you attack to the free-throw line, not the rim. Stopping there forces the top defender to pick you or the lane runner, and whichever he picks is wrong. Driving into two set defenders hands them the easy answer and takes both your runners out of the play.",
    coachingCue: "Three-on-two: get to the free-throw line, then read.",
  },
  {
    id: "demo-rep-4",
    gameId: DEMO_GAME_ID,
    order: 4,
    title: "Big in drop coverage",
    category: "pick-and-roll-read",
    difficulty: "medium",
    clipStartMs: 68000,
    decisionPauseMs: 82000,
    clipEndMs: 93400,
    situation: "Third quarter. Your five comes up for a ball screen at the right slot.",
    prompt:
      "Your man went over the screen and their big is dropping to the paint. What's your best read?",
    choices: [
      { id: "a", label: "Throw the lob to the roller" },
      { id: "b", label: "Take the pull-up in the pocket" },
      { id: "c", label: "Turn the corner and attack the big" },
      { id: "d", label: "Reject the screen back to the middle" },
    ],
    correctChoiceId: "b",
    actualChoiceId: "c",
    actualOutcome: "Drove into the drop — shot blocked at the rim.",
    explanation:
      "Drop coverage gives you the pocket every single time. The big is guarding the rim and your man is trailing behind the screen, so the two dribbles into the elbow are uncontested. Driving all the way in is attacking the one patch of floor they have covered.",
    coachingCue: "Big in drop, take the pocket pull-up.",
  },
  {
    id: "demo-rep-5",
    gameId: DEMO_GAME_ID,
    order: 5,
    title: "You're the low man",
    category: "defensive-rotation",
    difficulty: "hard",
    clipStartMs: 94000,
    decisionPauseMs: 107000,
    clipEndMs: 117400,
    situation: "Dragons swing it and drive baseline. You're guarding the weak-side corner.",
    prompt:
      "You're the low man and the ball is driving baseline at you. What's your best read?",
    choices: [
      { id: "a", label: "Stay attached to your man in the corner" },
      { id: "b", label: "Step in early and wall up at the rim" },
      { id: "c", label: "Dig at the ball, then recover to the corner" },
      { id: "d", label: "Rotate up to the top of the key" },
    ],
    correctChoiceId: "b",
    actualChoiceId: "a",
    actualOutcome: "Stayed home in the corner — uncontested layup.",
    explanation:
      "On a baseline drive the low man owns the rim. Step in early and build the wall so he has to shoot over you, and trust the next rotation to take your corner. Staying attached saves a contested corner three and gives up a layup — that trade never works.",
    coachingCue: "Low man on a baseline drive: you are the wall.",
  },
] as const;

export const DEMO_REPS: Rep[] = rawReps.map((rep) => repSchema.parse(rep));

export const DEMO_FILM_DURATION_MS = 118_000;

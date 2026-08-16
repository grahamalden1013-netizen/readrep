/**
 * Five coaches, for measuring the interview.
 *
 * Each is a set of answers a real coach might give, keyed by what the question
 * is about. The simulated coach never volunteers anything the persona wouldn't
 * — a terse coach stays terse — so the number of questions ReadRep needs is a
 * property of the interview, not of the script.
 */

export type Coach = {
  id: string;
  name: string;
  summary: string;
  /** Matched against the question text; first match wins. */
  answers: { match: RegExp; reply: string }[];
  /** Used when nothing matches, so the coach never goes silent. */
  fallback: string;
};

export const COACHES: Coach[] = [
  {
    id: "A",
    name: "Coach A — detailed",
    summary: "5-out, fast, gap attacks, Zoom, side P&R, downhill vs drop, man, switch 1-4",
    answers: [
      {
        match: /offen|play|creat|attack|identity|alignment/i,
        reply:
          "We're mostly 5-out. We want to play fast, attack gaps, and if nothing is there we flow into Zoom or side ball screens. Against drop I want my guards getting downhill. I hate early contested threes.",
      },
      {
        match: /defen|guard|stop|take away/i,
        reply:
          "Man to man, and we switch 1 through 4. We're trying to take away the paint first — help comes from the nail, low man rotates to the roller, and the weak side stunts and recovers rather than fully committing.",
      },
      {
        match: /roller|tag|low man|weak.?side|help/i,
        reply:
          "If the low man tags the roller, the ball handler skips it to the weak-side corner and we shake into the gap. The corner lifts to the wing.",
      },
      {
        match: /shot|three|selection|hunt|green light/i,
        reply:
          "Rim, corner threes, and free throws. I don't want long twos and I don't want an early contested three from anyone but our two guards.",
      },
      {
        match: /stop film|correct|priorit|drives|repeat|practice|mistake/i,
        reply:
          "I stop film for two things: no paint touch on a possession, and not sprinting back in transition. I can live with a turnover if we were being aggressive.",
      },
      {
        match: /right read|decision|outcome|missed|made/i,
        reply:
          "I coach the read. If they made the right play and it missed, I tell them to run it again. If they got lucky on a bad decision, we're still fixing it.",
      },
      {
        match: /shake|zoom|term|call|mean|language/i,
        reply:
          "Zoom is our pin-down into a handoff. Shake means the weak-side player lifts out of the corner into the gap behind the drive.",
      },
      {
        match: /transition|push|break|run/i,
        reply: "We push on every miss. First look is the rim, second is a drag screen.",
      },
      {
        match: /switch|mismatch|exception/i,
        reply: "We switch 1 through 4. Our 5 stays in drop — we don't switch him onto guards.",
      },
    ],
    fallback: "We keep it simple there — nothing special.",
  },
  {
    id: "B",
    name: "Coach B — very short answers",
    summary: "Answers in two or three words",
    answers: [
      { match: /offen|play|creat|attack|identity|alignment/i, reply: "5-out." },
      { match: /defen|guard|stop|take away/i, reply: "Mostly man." },
      { match: /switch|mismatch/i, reply: "We switch." },
      { match: /pace|fast|push|transition/i, reply: "Fast." },
      { match: /shot|three|selection/i, reply: "Good ones." },
      { match: /ball screen|drop|pick and roll|corner|downhill/i, reply: "Get downhill." },
      { match: /stop film|correct|priorit|mistake/i, reply: "Effort." },
      { match: /spacing|gap|paint/i, reply: "Stay spaced." },
      { match: /help|rotat|low man|nail/i, reply: "Help from the top." },
      { match: /right read|decision|outcome/i, reply: "The read." },
    ],
    fallback: "Depends.",
  },
  {
    id: "C",
    name: "Coach C — post team",
    summary: "4-out-1-in, everything through the post, minimal ball screens",
    answers: [
      {
        match: /offen|play|creat|attack|identity|alignment/i,
        reply:
          "We're 4-out-1-in and everything runs through our post. We barely use ball screens — we'd rather get a touch on the block and play off it.",
      },
      {
        match: /post|block|entry|duck|seal|inside/i,
        reply:
          "We enter from the wing on a high-low or off a cut. If they single cover, he scores. If they dig from the top, he kicks to the skip and we play inside-out.",
      },
      {
        match: /defen|guard|stop|take away/i,
        reply: "Man to man. We pack the paint and make teams shoot over us.",
      },
      {
        match: /spacing|gap|around|cut|off.?ball/i,
        reply:
          "On a post touch the two guards space above the break and the weak-side wing cuts baseline behind the defense.",
      },
      { match: /shot|three|selection/i, reply: "Post touches, layups and open catch-and-shoot threes. No off-the-dribble jumpers." },
      { match: /stop film|correct|priorit|mistake/i, reply: "Not looking inside. If the post is sealed and we swing it around, I'm stopping the film." },
      { match: /help|rotat|low man|nail/i, reply: "Help comes from the weak-side wing, and the top guard drops to cover the skip." },
      { match: /right read|decision|outcome/i, reply: "I grade the read, always." },
    ],
    fallback: "That doesn't really come up for us.",
  },
  {
    id: "D",
    name: "Coach D — zone team",
    summary: "2-3 zone, switches to man late",
    answers: [
      {
        match: /defen|guard|stop|take away/i,
        reply:
          "We sit in a 2-3 zone almost every possession, and we go man in the last four minutes or when we need to press up.",
      },
      {
        match: /zone|high post|short corner|baseline|shift/i,
        reply:
          "The top two take away the middle. Our back three cover the short corners — the ball-side wing takes the corner, the middle covers the high post, and the weak-side wing has to be at the rim on the skip.",
      },
      {
        match: /offen|play|creat|attack|identity|alignment/i,
        reply: "We're 4-out, play at a normal pace, and we want the ball reversed twice before we shoot.",
      },
      { match: /shot|three|selection/i, reply: "Anything after two ball reversals. I don't want a first-pass three." },
      { match: /rebound|box/i, reply: "Zone rebounding is our problem — everybody hits somebody, guards crash the weak side." },
      { match: /stop film|correct|priorit|mistake/i, reply: "Ball watching in the zone. And not rebounding out of it." },
      { match: /transition|back|push/i, reply: "First job is matching up to the zone spots, not the man." },
      { match: /right read|decision|outcome/i, reply: "The decision. Results lie." },
    ],
    fallback: "We handle that inside the zone.",
  },
  {
    id: "E",
    name: "Coach E — custom language",
    summary: "Heavy team-specific terminology",
    answers: [
      {
        match: /offen|play|creat|attack|identity|alignment/i,
        reply:
          "We run Delta out of a 5-out look. If Delta doesn't get us a Vegas, we flow into Rip and let our guards hunt.",
      },
      { match: /delta|vegas|rip|term|call|mean|language/i, reply: "Delta is our double drag. Vegas means a rim touch. Rip is a back screen for the trail big." },
      { match: /defen|guard|stop|take away/i, reply: "Man. We call our ball-screen coverage Blue, which is our version of ice on the sideline." },
      { match: /blue|ice|ball screen|coverage|drop/i, reply: "Blue means force it baseline, big contains at the level, low man is at the rim early." },
      { match: /shot|three|selection/i, reply: "Vegas or a corner three. Nothing else before ten seconds on the clock." },
      { match: /stop film|correct|priorit|mistake/i, reply: "No Vegas. If we go a whole possession without a rim touch, that's the correction." },
      { match: /right read|decision|outcome/i, reply: "The read every time." },
    ],
    fallback: "Standard stuff there.",
  },
];

export function answerFor(coach: Coach, question: string): string {
  return coach.answers.find((a) => a.match.test(question))?.reply ?? coach.fallback;
}

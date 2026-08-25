/**
 * ReadRep Phase 0 demonstration data.
 *
 * EVERY RECORD THIS SCRIPT WRITES IS MANUALLY AUTHORED BY A HUMAN.
 *
 * Nothing here was produced by a model, no video was processed, and no player
 * was identified by any automated system. Each derived record carries
 * `provenance: "manual_authoring"`, and the schemas refuse to let manually
 * authored content claim a model version. The interface labels this data as
 * demonstration data wherever it appears.
 *
 * The pick-and-roll moment reproduces Appendix A of the product blueprint
 * exactly, including its coach rule and its recorded uncertainty.
 *
 *   pnpm seed
 */
import {
  ConsentRecord,
  DecisionCandidate,
  Game,
  LearningMoment,
  Player,
  ProcessingRun,
  Team,
  User,
  VideoAsset,
  type Assignment,
  type CoachRule,
  type CoachSystem,
  type GuardianRelationship,
  type Membership,
} from "@readrep/domain";
import { QUESTIONS, resolveAnswer } from "../src/server/questionnaire";
import { hashPassword } from "../src/server/auth/password";
import {
  clearAllCollections,
  localStore,
  rawCollections,
} from "../src/server/store/local-store";
import { config } from "../src/server/config";

/** Development sign-in password for every seeded account. Local use only. */
const DEV_PASSWORD = "ReadRep-dev-2026";

const NOW = "2026-08-01T09:00:00.000Z";
const GAME_DATE = "2026-03-14T18:30:00.000Z";

const TEAM = "team-northside-16u";
const OTHER_TEAM = "team-eastbrook-prep";
const JORDAN = "player-jordan-ellis";
const TAYLOR = "player-taylor-brooks";
const GAME = "game-riverside-2026-03-14";
const ASSET = "asset-riverside-2026-03-14";

const users = [
  {
    id: "user-coach-riley",
    email: "coach@readrep.local",
    displayName: "Riley Nakamura",
  },
  {
    id: "user-player-jordan",
    email: "player@readrep.local",
    displayName: "Jordan Ellis",
  },
  { id: "user-parent-sam", email: "parent@readrep.local", displayName: "Sam Ellis" },
  { id: "user-trainer-alex", email: "trainer@readrep.local", displayName: "Alex Ruiz" },
  { id: "user-admin-morgan", email: "admin@readrep.local", displayName: "Morgan Diaz" },
  // Belongs to a different team. Exists so cross-account isolation can be tried
  // by hand in the running app, not only asserted in a test.
  {
    id: "user-coach-outsider",
    email: "outsider@readrep.local",
    displayName: "Casey Lund",
  },
] as const;

const memberships: Membership[] = [
  {
    id: "m-coach",
    userId: "user-coach-riley",
    teamId: TEAM,
    role: "coach",
    status: "active",
    playerId: null,
    createdAt: NOW,
  },
  {
    id: "m-admin",
    userId: "user-admin-morgan",
    teamId: TEAM,
    role: "program_admin",
    status: "active",
    playerId: null,
    createdAt: NOW,
  },
  {
    id: "m-player",
    userId: "user-player-jordan",
    teamId: TEAM,
    role: "player",
    status: "active",
    playerId: JORDAN,
    createdAt: NOW,
  },
  {
    id: "m-parent",
    userId: "user-parent-sam",
    teamId: TEAM,
    role: "guardian",
    status: "active",
    playerId: null,
    createdAt: NOW,
  },
  {
    id: "m-trainer",
    userId: "user-trainer-alex",
    teamId: TEAM,
    role: "trainer",
    status: "active",
    playerId: null,
    createdAt: NOW,
  },
  {
    id: "m-outsider",
    userId: "user-coach-outsider",
    teamId: OTHER_TEAM,
    role: "coach",
    status: "active",
    playerId: null,
    createdAt: NOW,
  },
] as never;

/* -------------------------------------------------------------------------- */
/* The blueprint's Appendix A moment                                           */
/* -------------------------------------------------------------------------- */

const PNR_OPTIONS = [
  {
    id: "opt-pnr-roller",
    label: "Hit the roller",
    quality: "suboptimal" as const,
    rationale:
      "The low defender has already stepped over to tag the roll. The pass is contested before it arrives.",
    courtArea: "paint" as const,
    trackId: null,
  },
  {
    id: "opt-pnr-skip",
    label: "Skip to the weak-side corner",
    quality: "preferred" as const,
    rationale:
      "The corner defender left first to tag the roller, so the weak-side corner is unattended. This is the read the coach's rule asks for.",
    courtArea: "left_corner" as const,
    trackId: null,
  },
  {
    id: "opt-pnr-finish",
    label: "Finish at the rim",
    quality: "high_risk" as const,
    rationale:
      "Driving into a tagged paint means finishing over both the big and the help. Low percentage with an open teammate available.",
    courtArea: "restricted_area" as const,
    trackId: null,
  },
  {
    id: "opt-pnr-reset",
    label: "Pull the ball out",
    quality: "acceptable" as const,
    rationale:
      "Not a mistake. It gives up an advantage the team created, but it does not turn the ball over.",
    courtArea: "top_of_key" as const,
    trackId: null,
  },
];

const PNR_INTERPRETATION = {
  category: "pick_and_roll_read" as const,
  observedFacts: [
    "Middle pick-and-roll at 7:42 of the second quarter; the ball handler reaches the screen.",
    "The low defender steps toward the roller as the screen is used.",
    "The weak-side corner is unattended at the moment the ball handler picks up their read.",
  ],
  basketballInference: [
    "The corner defender tagging the roller is what opens the weak-side corner.",
    "The advantage is created by the defender who leaves, not by the defender guarding the ball.",
  ],
  visualCue:
    "The low defender has stepped toward the roller and left the weak-side corner.",
  options: PNR_OPTIONS,
  preferredOptionId: "opt-pnr-skip",
  teachingCue:
    "Read the defender who leaves first — not only the defender in front of you.",
  // Recorded, and deliberately not used to grade any option above. The
  // preferred read here produced a miss.
  outcome: "missed_shot" as const,
  outcomeNote:
    "The skip pass was available and the corner shot was taken and missed. The read was still the right one.",
  citation: {
    provenance: "manual_authoring" as const,
    clipRange: { startMs: 1_654_000, endMs: 1_666_000 },
    frameIds: [],
    artifactIds: [],
    trackIds: [],
    coachRuleIds: ["rule-pnr-base-coverage-offense-r1"],
    confidence: {
      score: 0.72,
      band: "medium" as const,
      basis: "Manually authored from the blueprint example; no footage was analysed.",
    },
    uncertainty: [
      {
        kind: "timing_dependent" as const,
        detail:
          "Pass-window timing depends on the off-screen wing's spacing; coach review required.",
        resolvedBy: "A coach confirming the weak-side spacing on the full clip.",
      },
      {
        kind: "off_screen" as const,
        detail:
          "The weak-side wing is outside the camera frame for part of the window.",
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */

const CLOSEOUT_OPTIONS = [
  {
    id: "opt-co-drive",
    label: "Drive the top shoulder",
    quality: "preferred" as const,
    rationale:
      "The closeout arrives high and off balance. Attacking the top shoulder gets straight past it.",
    courtArea: "right_wing" as const,
    trackId: null,
  },
  {
    id: "opt-co-shoot",
    label: "Shoot over the closeout",
    quality: "acceptable" as const,
    rationale:
      "In rhythm and inside the shot profile, but the drive is the better read here.",
    courtArea: "right_wing" as const,
    trackId: null,
  },
  {
    id: "opt-co-swing",
    label: "Swing it to the corner",
    quality: "suboptimal" as const,
    rationale:
      "Gives up the advantage the closeout created. The corner defender is already set.",
    courtArea: "right_corner" as const,
    trackId: null,
  },
];

const CLOSEOUT_INTERPRETATION = {
  category: "attacking_a_closeout" as const,
  observedFacts: [
    "The ball is swung to the right wing with the defender closing out from the paint.",
    "The closeout arrives high, with the defender's weight forward.",
  ],
  basketballInference: [
    "A high, off-balance closeout cannot change direction, so the top shoulder is the fastest way past it.",
  ],
  visualCue: "The closing defender's weight is forward and their hands are high.",
  options: CLOSEOUT_OPTIONS,
  preferredOptionId: "opt-co-drive",
  teachingCue:
    "When the closeout is high and hard, go past the top shoulder immediately.",
  outcome: "made_shot" as const,
  outcomeNote:
    "The shot over the closeout went in. It was not the preferred read, and the result does not change that.",
  citation: {
    provenance: "manual_authoring" as const,
    clipRange: { startMs: 2_210_000, endMs: 2_221_000 },
    frameIds: [],
    artifactIds: [],
    trackIds: [],
    coachRuleIds: ["rule-closeout-attack-r1"],
    confidence: {
      score: 0.66,
      band: "medium" as const,
      basis: "Manually authored demonstration data; no footage was analysed.",
    },
    uncertainty: [
      {
        kind: "occlusion" as const,
        detail:
          "The help defender behind the play is partially occluded at the pause point.",
      },
    ],
  },
};

const LOWMAN_OPTIONS = [
  {
    id: "opt-lm-tag",
    label: "Step over and tag the roller",
    quality: "preferred" as const,
    rationale:
      "You are the low man. Tagging the roll is your job before recovering out.",
    courtArea: "paint" as const,
    trackId: null,
  },
  {
    id: "opt-lm-stay",
    label: "Stay attached to the corner",
    quality: "suboptimal" as const,
    rationale:
      "Leaves the roller uncontested at the rim, which is a higher-value shot than the corner three.",
    courtArea: "left_corner" as const,
    trackId: null,
  },
  {
    id: "opt-lm-switch",
    label: "Call a switch",
    quality: "high_risk" as const,
    rationale:
      "There is no switch call available from the weak side, and the communication arrives too late.",
    courtArea: "left_wing" as const,
    trackId: null,
  },
];

const LOWMAN_INTERPRETATION = {
  category: "tagging_rollers_paint_protection" as const,
  observedFacts: [
    "A ball screen is set at the top; the roller dives toward the rim.",
    "The target player is guarding the weak-side corner.",
  ],
  basketballInference: [],
  visualCue: "The roller is diving and no one has stepped into the paint yet.",
  options: LOWMAN_OPTIONS,
  preferredOptionId: "opt-lm-tag",
  teachingCue: "As the low man, tag the roll first and recover to the corner second.",
  outcome: "unknown" as const,
  outcomeNote: "The possession continues past the edge of this window.",
  citation: {
    provenance: "manual_authoring" as const,
    clipRange: { startMs: 2_890_000, endMs: 2_902_000 },
    frameIds: [],
    artifactIds: [],
    trackIds: [],
    coachRuleIds: ["rule-defense-low-man-r1"],
    confidence: {
      score: 0.61,
      band: "medium" as const,
      basis: "Manually authored demonstration data; no footage was analysed.",
    },
    uncertainty: [
      {
        kind: "ball_not_visible" as const,
        detail: "The ball leaves the frame briefly as the screen is set.",
      },
    ],
  },
};

/** A proposal with no applicable coach rule, to exercise the general-reasoning label. */
const UNGROUNDED_INTERPRETATION = {
  category: "transition_advantage" as const,
  observedFacts: [
    "The target player secures a defensive rebound with two teammates ahead of the ball.",
    "One opponent is back on defence.",
  ],
  basketballInference: [
    "A three-on-one is available if the ball is advanced before the defence recovers.",
  ],
  visualCue: "Two teammates are already past half court and only one defender is back.",
  options: [
    {
      id: "opt-tr-advance",
      label: "Throw the pass ahead",
      quality: "preferred" as const,
      rationale:
        "The pass beats the dribble to the advantage. This is general basketball reasoning, not a team rule.",
      courtArea: "backcourt" as const,
      trackId: null,
    },
    {
      id: "opt-tr-dribble",
      label: "Dribble it up yourself",
      quality: "suboptimal" as const,
      rationale:
        "Dribbling lets the defence recover and turns a three-on-one into a set possession.",
      courtArea: "backcourt" as const,
      trackId: null,
    },
  ],
  preferredOptionId: "opt-tr-advance",
  teachingCue: "When teammates are ahead of the ball, the pass beats the dribble.",
  outcome: "reset" as const,
  outcomeNote: null,
  citation: {
    provenance: "manual_authoring" as const,
    clipRange: { startMs: 3_400_000, endMs: 3_412_000 },
    frameIds: [],
    artifactIds: [],
    trackIds: [],
    // No coach rule applies, so the citation must say so. The interface then
    // labels this advice general basketball reasoning rather than team policy.
    coachRuleIds: [],
    confidence: {
      score: 0.48,
      band: "low" as const,
      basis:
        "No coach rule covers transition advantage decisions in this system revision.",
    },
    uncertainty: [
      {
        kind: "no_applicable_coach_rule" as const,
        detail:
          "The coach's system has no rule for this situation, so this is general basketball reasoning.",
      },
      {
        kind: "camera_cut" as const,
        detail: "The camera pans during the window and loses the trailing defender.",
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */

const seed = async (): Promise<void> => {
  await clearAllCollections();

  // Accounts and credentials -------------------------------------------------
  for (const u of users) {
    await localStore.identity.createUser(
      User.parse({ ...u, createdAt: NOW, deactivatedAt: null }),
    );
    const { passwordHash, salt } = await hashPassword(DEV_PASSWORD);
    await rawCollections.credentials.put({
      id: `cred-${u.id}`,
      userId: u.id,
      passwordHash,
      salt,
    });
  }

  for (const m of memberships) await localStore.identity.createMembership(m);

  // Teams --------------------------------------------------------------------
  await localStore.identity.createTeam(
    Team.parse({
      id: TEAM,
      name: "Northside Select 16U",
      programName: "Northside Select",
      season: "2026 Spring",
      level: "aau_u16",
      ownerUserId: "user-admin-morgan",
      activeCoachSystemRevision: 1,
      privacyDefaults: {
        guardiansMayViewFilm: true,
        playersMaySeeTeammateAttempts: false,
        trainersMayBeGranted: true,
        originalRetentionDays: 365,
      },
      createdAt: NOW,
    }),
  );
  await localStore.identity.createTeam(
    Team.parse({
      id: OTHER_TEAM,
      name: "Eastbrook Prep Varsity",
      programName: "Eastbrook Prep",
      season: "2026 Spring",
      level: "high_school_varsity",
      ownerUserId: "user-coach-outsider",
      activeCoachSystemRevision: null,
      privacyDefaults: {
        guardiansMayViewFilm: true,
        playersMaySeeTeammateAttempts: false,
        trainersMayBeGranted: false,
        originalRetentionDays: 365,
      },
      createdAt: NOW,
    }),
  );

  // Roster -------------------------------------------------------------------
  await localStore.identity.createPlayer(
    Player.parse({
      id: JORDAN,
      teamId: TEAM,
      fullName: "Jordan Ellis",
      displayName: "Jordan",
      userId: "user-player-jordan",
      jerseyHistory: [{ number: "4", effectiveFrom: NOW, effectiveTo: null }],
      isMinor: true,
      createdAt: NOW,
    }),
  );
  await localStore.identity.createPlayer(
    Player.parse({
      id: TAYLOR,
      teamId: TEAM,
      fullName: "Taylor Brooks",
      displayName: "Taylor",
      userId: null,
      jerseyHistory: [{ number: "11", effectiveFrom: NOW, effectiveTo: null }],
      isMinor: true,
      createdAt: NOW,
    }),
  );

  const guardianship: GuardianRelationship = {
    id: "guardian-sam-jordan",
    guardianUserId: "user-parent-sam",
    playerId: JORDAN,
    relationship: "parent",
    verifiedAt: NOW,
    verifiedByUserId: "user-admin-morgan",
    revokedAt: null,
    createdAt: NOW,
  } as never;
  await localStore.identity.createGuardianship(guardianship);

  // Consent. trainer_access is deliberately NOT granted, so the trainer role
  // demonstrates a real denial rather than a hidden button.
  const consentFor = (playerId: string, scope: string, state: string) =>
    ConsentRecord.parse({
      id: `consent-${playerId}-${scope}`,
      playerId,
      scope,
      state,
      grantedByUserId: state === "granted" ? "user-parent-sam" : null,
      grantedAt: state === "granted" ? NOW : null,
      expiresAt: null,
      withdrawnAt: null,
      method:
        state === "granted" ? "Signed pilot consent form (demonstration data)" : null,
      createdAt: NOW,
      updatedAt: NOW,
    });

  for (const [playerId, scope, state] of [
    [JORDAN, "film_upload", "granted"],
    [JORDAN, "automated_analysis", "granted"],
    [JORDAN, "coach_assignment", "granted"],
    [JORDAN, "trainer_access", "not_requested"],
    [TAYLOR, "film_upload", "granted"],
    [TAYLOR, "coach_assignment", "granted"],
  ] as const) {
    await localStore.consents.upsert(consentFor(playerId, scope, state));
  }

  // Coach system revision 1 --------------------------------------------------
  const answers = [
    { questionId: "offense-structure", value: "four_out_one_in" },
    { questionId: "spacing-width", value: "corners_filled" },
    { questionId: "spacing-cut", value: "backdoor" },
    { questionId: "transition-first-look", value: "rim" },
    { questionId: "pnr-base-coverage-offense", value: "skip_weak_side" },
    { questionId: "pnr-screen-usage", value: "two_dribbles" },
    { questionId: "shot-profile-good", value: "rim_and_corner" },
    { questionId: "shot-profile-clock", value: "best_available" },
    { questionId: "closeout-attack", value: "attack_shoulder" },
    { questionId: "defense-pnr-coverage", value: "drop" },
    { questionId: "defense-switching", value: "like_positions" },
    { questionId: "defense-low-man", value: "low_man" },
    { questionId: "defense-help-recovery", value: "own_man" },
    { questionId: "defense-closeout", value: "high_hands_short" },
    { questionId: "rebounding", value: "one" },
    { questionId: "terminology", value: "low_man" },
  ];

  const system: CoachSystem = {
    id: `coachsys-${TEAM}-r1`,
    teamId: TEAM,
    revision: 1,
    status: "active",
    authoredByUserId: "user-coach-riley",
    summary:
      "We play four-out with one big inside. We want rim attempts and corner threes, we tag the roller with the low man, and we never leave the corner uncovered on a drive.",
    createdAt: NOW,
    activatedAt: NOW,
    supersededAt: null,
  } as never;
  await localStore.coachSystems.create(system);

  const rules: CoachRule[] = [];
  for (const answer of answers) {
    const resolved = resolveAnswer(answer);
    if (!resolved)
      throw new Error(`seed references unknown answer ${answer.questionId}`);
    rules.push({
      id: `rule-${resolved.question.id}-r1`,
      key: resolved.question.id,
      coachSystemId: system.id,
      teamId: TEAM,
      revision: 1,
      topic: resolved.question.topic,
      statement: resolved.option.statement,
      detail: null,
      terminology: [],
      appliesTo: resolved.question.appliesTo,
      sourceQuestionId: resolved.question.id,
      createdAt: NOW,
    } as never);
  }
  await localStore.coachSystems.createRules(rules);

  // Game and video asset -----------------------------------------------------
  await localStore.games.create(
    Game.parse({
      id: GAME,
      teamId: TEAM,
      title: "vs. Riverside Elite — 14 March 2026",
      status: "ready",
      uploadedByUserId: "user-parent-sam",
      context: {
        opponentName: "Riverside Elite 16U",
        playedOn: GAME_DATE,
        uniformColor: "Navy",
        opponentUniformColor: "White",
        firstHalfDirection: "left_to_right",
        targetPlayerStarted: true,
        reviewFocus: "Ball-screen reads and weak-side help decisions.",
      },
      targetPlayerIds: [JORDAN],
      videoAssetId: ASSET,
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );

  // No footage, no provider, no playback. The interface renders an honest
  // "authorized clip required" state rather than a broken player.
  await localStore.games.upsertVideoAsset(
    VideoAsset.parse({
      id: ASSET,
      gameId: GAME,
      status: "reserved",
      providerName: "none",
      providerAssetId: null,
      providerUploadId: null,
      providerPlaybackId: null,
      durationMs: null,
      renditions: [],
      retentionExpiresAt: null,
      deletedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );

  await localStore.processingRuns.create(
    ProcessingRun.parse({
      id: `run-${GAME}`,
      gameId: GAME,
      videoAssetId: ASSET,
      // Honest: these moments were written by hand and are waiting on a coach.
      // No upload, transcode, tracking, or analysis stage ever ran.
      state: "awaiting_coach_review",
      resumeState: null,
      pipelineVersion: "0.1.0",
      stages: [],
      failure: null,
      deletion: null,
      appliedEventKeys: [],
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );

  // Candidates ---------------------------------------------------------------
  const candidate = (
    id: string,
    interpretation: unknown,
    status: string,
    teachability: number,
    confidenceBasis: string,
    score: number,
  ) =>
    DecisionCandidate.parse({
      id,
      gameId: GAME,
      videoAssetId: ASSET,
      teamId: TEAM,
      playerId: JORDAN,
      possessionId: null,
      status,
      evidenceWindow: (interpretation as { citation: { clipRange: unknown } }).citation
        .clipRange,
      pausePointMs:
        (interpretation as { citation: { clipRange: { startMs: number } } }).citation
          .clipRange.startMs + 5_000,
      teachabilityScore: teachability,
      rankConfidence: {
        score,
        band: score < 0.5 ? "low" : score < 0.8 ? "medium" : "high",
        basis: confidenceBasis,
      },
      interpretation,
      coachSystemRevision: 1,
      createdAt: NOW,
      updatedAt: NOW,
    });

  await localStore.candidates.create(
    candidate(
      "cand-pnr-low-tag",
      PNR_INTERPRETATION,
      "approved",
      0.91,
      "Manually authored from blueprint Appendix A.",
      0.72,
    ),
  );
  await localStore.candidates.create(
    candidate(
      "cand-closeout-attack",
      CLOSEOUT_INTERPRETATION,
      "proposed",
      0.78,
      "Manually authored demonstration candidate awaiting coach review.",
      0.66,
    ),
  );
  await localStore.candidates.create(
    candidate(
      "cand-low-man-tag",
      LOWMAN_INTERPRETATION,
      "proposed",
      0.7,
      "Manually authored demonstration candidate awaiting coach review.",
      0.61,
    ),
  );
  await localStore.candidates.create(
    candidate(
      "cand-transition-ungrounded",
      UNGROUNDED_INTERPRETATION,
      "proposed",
      0.55,
      "No coach rule covers this situation in revision 1.",
      0.48,
    ),
  );

  // Published moments --------------------------------------------------------
  //
  // provenance is `manual_authoring`, and sourceReviewId is null, because no
  // coach actually reviewed these — a person wrote them. Labelling them
  // `coach_approved` would be a lie the schema would happily have accepted.
  const moment = (
    id: string,
    candidateId: string,
    interpretation: typeof PNR_INTERPRETATION,
    question: LearningMoment["question"],
  ) =>
    LearningMoment.parse({
      id,
      teamId: TEAM,
      playerId: JORDAN,
      gameId: GAME,
      videoAssetId: ASSET,
      sourceCandidateId: candidateId,
      sourceReviewId: null,
      provenance: "manual_authoring",
      clipRange: interpretation.citation.clipRange,
      pausePointMs: interpretation.citation.clipRange.startMs + 5_000,
      question,
      interpretation,
      tags: [interpretation.category, "demonstration-data"],
      citation: interpretation.citation,
      createdAt: NOW,
      retiredAt: null,
    });

  await localStore.learning.createMoment(
    moment("moment-pnr-low-tag", "cand-pnr-low-tag", PNR_INTERPRETATION, {
      prompt: "What is your best read before taking another dribble?",
      responseType: "multiple_choice",
      choiceOptionIds: PNR_OPTIONS.map((o) => o.id),
      selectableAreas: [],
      selectableTrackIds: [],
      postRevealHint: null,
    } as never),
  );

  await localStore.learning.createMoment(
    moment(
      "moment-closeout-attack",
      "cand-closeout-attack",
      CLOSEOUT_INTERPRETATION as never,
      {
        prompt: "Where are you attacking as the closeout arrives?",
        responseType: "select_court_area",
        choiceOptionIds: [],
        selectableAreas: ["right_wing", "right_corner", "paint", "top_of_key"],
        selectableTrackIds: [],
        postRevealHint: null,
      } as never,
    ),
  );

  await localStore.learning.createMoment(
    moment(
      "moment-low-man-tag",
      "cand-low-man-tag",
      LOWMAN_INTERPRETATION as never,
      {
        prompt: "You are the low man. Say what your job is on this roll.",
        responseType: "short_text",
        choiceOptionIds: [],
        selectableAreas: [],
        selectableTrackIds: [],
        postRevealHint: null,
      } as never,
    ),
  );

  const assignment: Assignment = {
    id: "assignment-jordan-week-1",
    teamId: TEAM,
    playerId: JORDAN,
    assignedByUserId: "user-coach-riley",
    title: "Ball-screen reads — Riverside",
    momentIds: ["moment-pnr-low-tag", "moment-closeout-attack", "moment-low-man-tag"],
    status: "assigned",
    assignedAt: NOW,
    startedAt: null,
    completedAt: null,
    revokedAt: null,
  } as never;
  await localStore.learning.createAssignment(assignment);

  console.log(`
ReadRep demonstration data loaded into ${config.dataDir}

  EVERY RECORD IS MANUALLY AUTHORED. No video was processed, no player was
  identified automatically, and no model produced any of this content. The
  pick-and-roll moment reproduces Appendix A of the product blueprint.

  Accounts (password for all: ${DEV_PASSWORD})

    coach@readrep.local      Riley Nakamura   coach, Northside Select 16U
    player@readrep.local     Jordan Ellis     player
    parent@readrep.local     Sam Ellis        guardian of Jordan
    trainer@readrep.local    Alex Ruiz        trainer, NO access grant
    admin@readrep.local      Morgan Diaz      program administrator
    outsider@readrep.local   Casey Lund       coach of a DIFFERENT team

  Try:
    - Sign in as the player and work through "Ball-screen reads — Riverside".
    - Sign in as the coach and review the three pending candidates.
    - Sign in as the trainer: no grant exists, so the roster is refused.
    - Sign in as the outsider and open the player's session URL: refused.

  ${QUESTIONS.length} survey questions produced ${rules.length} citable coach rules at revision 1.
`);
};

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

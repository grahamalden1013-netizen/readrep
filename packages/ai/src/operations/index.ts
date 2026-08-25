import { z } from "zod";
import { defineOperation } from "../operation.js";
import {
  EvidenceWindow,
  GroundedOutput,
  Observation,
  SuppliedCoachRule,
} from "../shared.js";

/*
 * The eight operations from blueprint §8.
 *
 * Each is narrow enough that its output can be checked against a fixture, and
 * none of them is allowed to do another's job. `decision_analysis` cannot
 * invent a coach rule; `coach_rule_match` cannot rate a read; `player_question`
 * cannot decide what the preferred answer is.
 */

/* -------------------------------------------------------------------------- */

export const frameWindowSummary = defineOperation({
  name: "frame_window_summary",
  purpose:
    "Describe only what is visible in a short window. May not infer intent, name players, or judge decisions.",
  inputSchema: z.object({
    window: EvidenceWindow,
    targetTrackId: z.string().min(1).nullable(),
  }),
  outputSchema: GroundedOutput.extend({
    observations: z.array(Observation).min(1).max(12),
    /** What the camera did not show. Required, and may be empty only honestly. */
    visibilityLimits: z.array(z.string().trim().min(1).max(280)).default([]),
  }),
  timeoutMs: 20_000,
  tier: "fast",
  promptVersion: "0.1.0",
  schemaVersion: "0.1.0",
  maxCostMicroUsd: 20_000,
});

export const decisionCandidateRank = defineOperation({
  name: "decision_candidate_rank",
  purpose:
    "Judge whether a timestamp is worth a coach's attention. Ranking only; it does not analyse the read.",
  inputSchema: z.object({
    window: EvidenceWindow,
    observations: z.array(Observation).max(12),
    possessionControl: z.enum(["target_team", "opponent", "unknown"]),
  }),
  outputSchema: GroundedOutput.extend({
    category: z.string().min(1),
    teachabilityScore: z.number().min(0).max(1),
    /** Why this moment, in the reviewer's language. */
    reason: z.string().trim().min(1).max(400),
  }),
  timeoutMs: 15_000,
  tier: "fast",
  promptVersion: "0.1.0",
  schemaVersion: "0.1.0",
  maxCostMicroUsd: 10_000,
});

export const coachRuleMatch = defineOperation({
  name: "coach_rule_match",
  purpose:
    "Say which of the supplied coach rules apply. It may only choose from rules given to it; it may never author one.",
  inputSchema: z.object({
    category: z.string().min(1),
    observations: z.array(Observation).max(12),
    /** The candidate rules. An empty list is a valid input and a valid answer. */
    availableRules: z.array(SuppliedCoachRule).max(40),
  }),
  outputSchema: GroundedOutput.extend({
    matchedRuleIds: z.array(z.string().min(1)).default([]),
    rationale: z.string().trim().min(1).max(600),
  }),
  timeoutMs: 15_000,
  tier: "balanced",
  promptVersion: "0.1.0",
  schemaVersion: "0.1.0",
  maxCostMicroUsd: 15_000,
});

export const decisionAnalysis = defineOperation({
  name: "decision_analysis",
  purpose:
    "Evaluate the available reads. Rates each option's quality and records the outcome separately; it must never derive one from the other.",
  inputSchema: z.object({
    window: EvidenceWindow,
    category: z.string().min(1),
    observations: z.array(Observation).min(1).max(12),
    matchedRules: z.array(SuppliedCoachRule).max(10),
    allowedCategories: z.array(z.string().min(1)).min(1),
  }),
  outputSchema: GroundedOutput.extend({
    observedFacts: z.array(z.string().trim().min(1).max(400)).min(1),
    basketballInference: z.array(z.string().trim().min(1).max(400)).default([]),
    visualCue: z.string().trim().min(1).max(400),
    options: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(120),
          quality: z.enum([
            "preferred",
            "acceptable",
            "suboptimal",
            "high_risk",
            "unclear",
          ]),
          rationale: z.string().trim().min(1).max(600),
        }),
      )
      .min(2)
      .max(6),
    preferredOptionLabel: z.string().trim().min(1).max(120),
    teachingCue: z.string().trim().min(1).max(400),
    /** Recorded, never used to rate the options above. */
    outcome: z.enum([
      "made_shot",
      "missed_shot",
      "assist",
      "turnover",
      "foul_drawn",
      "offensive_rebound",
      "defensive_stop",
      "reset",
      "unknown",
    ]),
    citedRuleIds: z.array(z.string().min(1)).default([]),
  }),
  timeoutMs: 45_000,
  tier: "deep",
  promptVersion: "0.1.0",
  schemaVersion: "0.1.0",
  maxCostMicroUsd: 120_000,
});

export const coachReviewAssist = defineOperation({
  name: "coach_review_assist",
  purpose:
    "Prepare a short editable draft plus the questions a coach should settle. It proposes; it never approves.",
  inputSchema: z.object({
    observedFacts: z.array(z.string().min(1)).min(1),
    basketballInference: z.array(z.string().min(1)).default([]),
    matchedRules: z.array(SuppliedCoachRule).max(10),
  }),
  outputSchema: GroundedOutput.extend({
    draftExplanation: z.string().trim().min(1).max(800),
    /** What the model wants the coach to decide. Surfaced, not hidden. */
    questionsForCoach: z.array(z.string().trim().min(1).max(240)).max(5).default([]),
  }),
  timeoutMs: 20_000,
  tier: "balanced",
  promptVersion: "0.1.0",
  schemaVersion: "0.1.0",
  maxCostMicroUsd: 20_000,
});

export const playerQuestion = defineOperation({
  name: "player_question",
  purpose:
    "Write the pre-reveal prompt and the choices. It must not reveal which choice is preferred.",
  inputSchema: z.object({
    category: z.string().min(1),
    visualCue: z.string().min(1),
    optionLabels: z.array(z.string().min(1)).min(2).max(6),
    responseType: z.enum([
      "multiple_choice",
      "select_player",
      "select_court_area",
      "short_text",
    ]),
  }),
  outputSchema: GroundedOutput.extend({
    prompt: z.string().trim().min(1).max(300),
    /** Choices in presentation order. Order must not encode the answer. */
    orderedOptionLabels: z.array(z.string().min(1)).min(2).max(6),
  }),
  timeoutMs: 12_000,
  tier: "fast",
  promptVersion: "0.1.0",
  schemaVersion: "0.1.0",
  maxCostMicroUsd: 8_000,
});

export const playerExplanation = defineOperation({
  name: "player_explanation",
  purpose:
    "Turn approved analysis into short, respectful teaching language. It may not introduce any claim not already approved.",
  inputSchema: z.object({
    observedFacts: z.array(z.string().min(1)).min(1),
    visualCue: z.string().min(1),
    preferredOptionLabel: z.string().min(1),
    citedRuleStatements: z.array(z.string().min(1)).max(10),
    coachNote: z.string().max(1200).nullable(),
  }),
  outputSchema: GroundedOutput.extend({
    whatHappened: z.string().trim().min(1).max(400),
    cueToRecognize: z.string().trim().min(1).max(300),
    nextTimeRule: z.string().trim().min(1).max(300),
  }),
  timeoutMs: 15_000,
  tier: "balanced",
  promptVersion: "0.1.0",
  schemaVersion: "0.1.0",
  maxCostMicroUsd: 12_000,
});

export const sessionRecommendation = defineOperation({
  name: "session_recommendation",
  purpose:
    "Choose which approved moments a player should see next. It selects from published moments only.",
  inputSchema: z.object({
    playerId: z.string().min(1),
    availableMomentIds: z.array(z.string().min(1)).min(1).max(200),
    recentAttempts: z
      .array(
        z.object({
          momentId: z.string().min(1),
          decisionQuality: z.string().min(1),
          revisitRequested: z.boolean(),
        }),
      )
      .max(100),
    targetCount: z.number().int().min(1).max(10),
  }),
  outputSchema: GroundedOutput.extend({
    momentIds: z.array(z.string().min(1)).min(1).max(10),
    reason: z.string().trim().min(1).max(400),
  }),
  timeoutMs: 12_000,
  tier: "fast",
  promptVersion: "0.1.0",
  schemaVersion: "0.1.0",
  maxCostMicroUsd: 6_000,
});

/** Every operation ReadRep is permitted to run, keyed by name. */
export const OPERATIONS = {
  frame_window_summary: frameWindowSummary,
  decision_candidate_rank: decisionCandidateRank,
  coach_rule_match: coachRuleMatch,
  decision_analysis: decisionAnalysis,
  coach_review_assist: coachReviewAssist,
  player_question: playerQuestion,
  player_explanation: playerExplanation,
  session_recommendation: sessionRecommendation,
} as const;

export type OperationRegistry = typeof OPERATIONS;

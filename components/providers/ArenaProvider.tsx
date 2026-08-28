"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type {
  ArenaProfile,
  Category,
  DebateFormat,
  DebateRun,
  EvidenceItem,
  GradeBand,
  IssueProfile,
  JudgeFeedback,
  Opponent,
  PerspectiveFeedback,
  RoundType,
} from "@/types/ngn";
import {
  applyDebateResult,
  applyPerspectiveResult,
  createProfile,
} from "@/lib/arena/profile";
import {
  clear,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  update,
  type ArenaState,
} from "@/lib/arena/store";

/**
 * Client-held Arena state.
 *
 * Every mutation goes through a pure function in `lib/arena/profile.ts` and is
 * committed through `lib/arena/store.ts`, so the rating, badge and streak logic
 * stays testable and the persistence layer stays swappable.
 */

export type BeginRunInput = {
  debateSlug: string;
  format: DebateFormat;
  position: "support" | "oppose";
  wasAssigned: boolean;
  preConfidence: number | null;
  opponent: Opponent;
};

type ArenaContextValue = {
  /** False until the client snapshot has replaced the server one. */
  ready: boolean;
  profile: ArenaProfile | null;
  activeRun: DebateRun | null;
  history: DebateRun[];

  ensureProfile: (username?: string) => ArenaProfile;
  updateProfile: (patch: Partial<ArenaProfile>) => void;
  completeOnboarding: (input: {
    username: string;
    interests: Category[];
    gradeBand: GradeBand | null;
    school: string | null;
    state: string | null;
  }) => void;
  setIssueProfile: (profile: IssueProfile | null, visible: boolean) => void;

  beginRun: (input: BeginRunInput) => void;
  submitRound: (input: {
    roundIndex: number;
    type: RoundType;
    userText: string;
    opponentText: string;
    evidence: EvidenceItem[];
  }) => void;
  finishRun: (input: {
    userScore: JudgeFeedback;
    opponentScore: JudgeFeedback;
  }) => { newBadges: string[] };
  recordPerspective: (feedback: PerspectiveFeedback) => { newBadges: string[] };
  abandonRun: () => void;
  runForSlug: (slug: string) => DebateRun | null;
  reset: () => void;
};

const ArenaContext = createContext<ArenaContextValue | null>(null);

export function ArenaProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore<ArenaState>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const ensureProfile = useCallback((username?: string): ArenaProfile => {
    let profile: ArenaProfile | null = null;
    update((current) => {
      if (current.profile) {
        profile = current.profile;
        return current;
      }
      const created = createProfile(username ?? suggestUsername());
      profile = created;
      return { ...current, profile: created };
    });
    // `update` runs its transition synchronously, so this is always assigned.
    return profile!;
  }, []);

  const updateProfile = useCallback((patch: Partial<ArenaProfile>) => {
    update((current) =>
      current.profile
        ? { ...current, profile: { ...current.profile, ...patch } }
        : current,
    );
  }, []);

  const completeOnboarding = useCallback<ArenaContextValue["completeOnboarding"]>(
    ({ username, interests, gradeBand, school, state: usState }) => {
      update((current) => {
        const base = current.profile ?? createProfile(username);
        return {
          ...current,
          profile: {
            ...base,
            username,
            interests,
            gradeBand,
            school,
            state: usState,
            onboarded: true,
          },
        };
      });
    },
    [],
  );

  const setIssueProfile = useCallback(
    (issueProfile: IssueProfile | null, visible: boolean) => {
      update((current) =>
        current.profile
          ? {
              ...current,
              profile: {
                ...current.profile,
                issueProfile,
                issueProfileVisible: visible,
              },
            }
          : current,
      );
    },
    [],
  );

  const beginRun = useCallback((input: BeginRunInput) => {
    update((current) => {
      const profile = current.profile ?? createProfile(suggestUsername());
      const run: DebateRun = {
        id: `run-${Date.now()}`,
        debateSlug: input.debateSlug,
        format: input.format,
        position: input.position,
        wasAssigned: input.wasAssigned,
        preConfidence: input.preConfidence,
        opponent: input.opponent,
        rounds: [],
        currentRound: 0,
        status: "writing",
        startedAt: new Date().toISOString(),
        completedAt: null,
        userScore: null,
        opponentScore: null,
        outcome: null,
        ratingBefore: profile.rating,
        ratingAfter: null,
        opponentRatingAfter: null,
        perspective: null,
      };
      return { ...current, profile, activeRun: run };
    });
  }, []);

  const submitRound = useCallback<ArenaContextValue["submitRound"]>(
    ({ roundIndex, type, userText, opponentText, evidence }) => {
      update((current) => {
        if (!current.activeRun) return current;
        // Re-submitting a round replaces it rather than duplicating it.
        const rounds = current.activeRun.rounds.filter(
          (r) => r.roundIndex !== roundIndex,
        );
        return {
          ...current,
          activeRun: {
            ...current.activeRun,
            rounds: [
              ...rounds,
              {
                roundIndex,
                type,
                userText,
                opponentText,
                evidence,
                submittedAt: new Date().toISOString(),
              },
            ].sort((a, b) => a.roundIndex - b.roundIndex),
            currentRound: roundIndex + 1,
            status: "revealed",
          },
        };
      });
    },
    [],
  );

  const finishRun = useCallback<ArenaContextValue["finishRun"]>(
    ({ userScore, opponentScore }) => {
      let newBadges: string[] = [];

      update((current) => {
        if (!current.activeRun || !current.profile) return current;

        const result = applyDebateResult({
          profile: current.profile,
          userScore,
          opponentScore,
          opponentRating: current.activeRun.opponent.rating,
        });
        newBadges = result.newBadges;

        const completed: DebateRun = {
          ...current.activeRun,
          status: "complete",
          completedAt: new Date().toISOString(),
          userScore,
          opponentScore,
          outcome: result.outcome,
          ratingBefore: result.ratingBefore,
          ratingAfter: result.ratingAfter,
          opponentRatingAfter: result.opponentRatingAfter,
        };

        // Stamp the slug onto the history entry this result just created.
        const ratingHistory = [...result.profile.ratingHistory];
        const last = ratingHistory.length - 1;
        if (last >= 0) {
          ratingHistory[last] = {
            ...ratingHistory[last],
            debateSlug: completed.debateSlug,
          };
        }

        return {
          hydrated: true,
          profile: { ...result.profile, ratingHistory },
          activeRun: completed,
          history: [completed, ...current.history].slice(0, 40),
        };
      });

      return { newBadges };
    },
    [],
  );

  const recordPerspective = useCallback<ArenaContextValue["recordPerspective"]>(
    (feedback) => {
      let newBadges: string[] = [];

      update((current) => {
        if (!current.profile) return current;
        const result = applyPerspectiveResult({
          profile: current.profile,
          feedback,
        });
        newBadges = result.newBadges;

        const activeRun = current.activeRun
          ? { ...current.activeRun, perspective: feedback }
          : null;

        return {
          hydrated: true,
          profile: result.profile,
          activeRun,
          history: activeRun
            ? current.history.map((run) =>
                run.id === activeRun.id ? activeRun : run,
              )
            : current.history,
        };
      });

      return { newBadges };
    },
    [],
  );

  const abandonRun = useCallback(() => {
    update((current) => ({ ...current, activeRun: null }));
  }, []);

  const runForSlug = useCallback(
    (slug: string): DebateRun | null => {
      if (state.activeRun?.debateSlug === slug) return state.activeRun;
      return state.history.find((run) => run.debateSlug === slug) ?? null;
    },
    [state.activeRun, state.history],
  );

  const reset = useCallback(() => clear(), []);

  const value = useMemo<ArenaContextValue>(
    () => ({
      ready: state.hydrated,
      profile: state.profile,
      activeRun: state.activeRun,
      history: state.history,
      ensureProfile,
      updateProfile,
      completeOnboarding,
      setIssueProfile,
      beginRun,
      submitRound,
      finishRun,
      recordPerspective,
      abandonRun,
      runForSlug,
      reset,
    }),
    [
      state,
      ensureProfile,
      updateProfile,
      completeOnboarding,
      setIssueProfile,
      beginRun,
      submitRound,
      finishRun,
      recordPerspective,
      abandonRun,
      runForSlug,
      reset,
    ],
  );

  return <ArenaContext.Provider value={value}>{children}</ArenaContext.Provider>;
}

export function useArena(): ArenaContextValue {
  const context = useContext(ArenaContext);
  if (!context) {
    throw new Error("useArena must be used inside ArenaProvider");
  }
  return context;
}

/* -------------------------------------------------------------------------- */

const HANDLE_PARTS = [
  "warrant", "footnote", "premise", "margin", "ledger", "citation",
  "rebuttal", "clause", "evidence", "steelman",
];

/**
 * A neutral, non-identifying default handle. Never derived from an email or a
 * real name — students pick their own during onboarding.
 */
export function suggestUsername(): string {
  const word = HANDLE_PARTS[Math.floor(Math.random() * HANDLE_PARTS.length)];
  const number = Math.floor(Math.random() * 900) + 100;
  return `${word}${number}`;
}

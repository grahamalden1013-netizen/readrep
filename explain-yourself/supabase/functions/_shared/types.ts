// Mirrors ExplainYourselfKit. Kept deliberately small and explicit rather than
// generated, because these two implementations agreeing is a correctness
// property and a generator would hide a disagreement rather than surface it.

export type GameMode =
  | "explainYourself"
  | "truthOrCap"
  | "noContext"
  | "whoHasToExplainThis";

export type Intensity = "chill" | "dangerous" | "chaos";

export type GamePhase =
  | "waiting" | "preparingPhotos" | "ready"
  | "roundIntro" | "photoReveal" | "ownerReveal" | "secretInstruction"
  | "explanationTimer" | "answering" | "voting" | "resultReveal"
  | "roundComplete" | "gameComplete";

export type RoundStatus = "active" | "removedByOwner" | "skipped" | "complete";
export type PlayerStatus = "joined" | "selectingPhotos" | "ready" | "disconnected";
export type SecretInstruction = "tellTheTruth" | "lie";
export type EndReason = "completed" | "hostEnded" | "abandoned" | "notEnoughPlayers";

export interface GameSettings {
  mode: GameMode;
  roundCount: number;
  intensity: Intensity;
  soundEnabled: boolean;
}

export interface VoteChoice {
  kind: "fair_enough" | "absolute_cap" | "truth" | "cap" | "player" | "answer";
  value?: string;
}

export interface Vote {
  roundID: string;
  voterID: string;
  choice: VoteChoice;
  castAt: string;
}

export interface PlayerAnswer {
  id: string;
  roundID: string;
  authorID: string;
  text: string;
  submittedAt: string;
}

export interface Round {
  id: string;
  index: number;
  mode: GameMode;
  ownerID: string;
  assetID: string;
  commitment: { digest: string } | null;
  /** Server-side only. Never written into `public_state`. */
  secret: { instruction: SecretInstruction; nonce: string } | null;
  votes: Vote[];
  answers: PlayerAnswer[];
  status: RoundStatus;
  startedAt: string;
  ownerRevealed: boolean;
  secretDelivered: boolean;
  resultsRevealed: boolean;
}

export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  status: PlayerStatus;
  approvedAssetCount: number;
}

/** The authoritative state. Lives in `game_session_private`. */
export interface PrivateState {
  roomID: string;
  settings: GameSettings;
  phase: GamePhase;
  roundIndex: number;
  currentRound: Round | null;
  completedRounds: Round[];
  scores: Record<string, number>;
  revision: number;
  phaseDeadline: string | null;
  endedReason: EndReason | null;
  /** Kept so a whole game replays identically from its seed. */
  dealerSeed: string;
  dealerStep: number;
}

export const MODE_HIDES_OWNER: Record<GameMode, boolean> = {
  explainYourself: false,
  truthOrCap: false,
  noContext: true,
  whoHasToExplainThis: true,
};

export const MODE_USES_SECRET: Record<GameMode, boolean> = {
  explainYourself: false,
  truthOrCap: true,
  noContext: false,
  whoHasToExplainThis: false,
};

export const PHASE_SEQUENCE: Record<GameMode, GamePhase[]> = {
  explainYourself: [
    "roundIntro", "photoReveal", "ownerReveal", "explanationTimer",
    "voting", "resultReveal", "roundComplete",
  ],
  truthOrCap: [
    "roundIntro", "photoReveal", "ownerReveal", "secretInstruction",
    "explanationTimer", "voting", "resultReveal", "roundComplete",
  ],
  noContext: [
    "roundIntro", "photoReveal", "answering", "voting",
    "resultReveal", "explanationTimer", "roundComplete",
  ],
  whoHasToExplainThis: [
    "roundIntro", "photoReveal", "voting", "ownerReveal",
    "explanationTimer", "resultReveal", "roundComplete",
  ],
};

/** Seconds. `null` means the phase waits for a human. */
export function phaseDuration(phase: GamePhase, mode: GameMode): number | null {
  switch (phase) {
    case "roundIntro": return 3.2;
    case "photoReveal": return 1.6;
    case "ownerReveal": return 2.0;
    case "secretInstruction": return 3.5;
    case "explanationTimer": return mode === "noContext" ? 20 : 15;
    case "answering": return 45;
    case "voting": return 30;
    default: return null;
  }
}

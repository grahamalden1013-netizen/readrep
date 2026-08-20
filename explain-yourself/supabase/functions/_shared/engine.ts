import {
  GamePhase, PrivateState, Player, Round, Vote,
  MODE_USES_SECRET, PHASE_SEQUENCE, phaseDuration,
  SecretInstruction, EndReason,
} from "./types.ts";

// ─── Deterministic randomness ────────────────────────────────────────────────
// SplitMix64, matching `SeededGenerator` in ExplainYourselfKit, so a seed
// replays the same game on either implementation.

const MASK = (1n << 64n) - 1n;

export class Rng {
  private state: bigint;
  public step: number;

  constructor(seed: string, step = 0) {
    this.state = BigInt(seed) & MASK;
    this.step = 0;
    // Fast-forward so resuming from a stored step is exact.
    for (let i = 0; i < step; i++) this.next();
  }

  next(): bigint {
    this.step++;
    this.state = (this.state + 0x9E3779B97F4A7C15n) & MASK;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n) & MASK;
    z = ((z ^ (z >> 27n)) * 0x94D049BB133111EBn) & MASK;
    return (z ^ (z >> 31n)) & MASK;
  }

  /** Uniform in [0, bound). */
  int(bound: number): number {
    if (bound <= 0) return 0;
    return Number(this.next() % BigInt(bound));
  }

  double(): number {
    return Number(this.next() >> 11n) / Number(1n << 53n);
  }

  pick<T>(items: T[]): T {
    return items[this.int(items.length)];
  }

  hex(bytes: number): string {
    let out = "";
    while (out.length < bytes * 2) out += this.next().toString(16).padStart(16, "0");
    return out.slice(0, bytes * 2);
  }
}

// ─── Commitment ──────────────────────────────────────────────────────────────

export async function digest(instruction: SecretInstruction, nonce: string): Promise<string> {
  const data = new TextEncoder().encode(`${nonce}|${instruction}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Dealing ─────────────────────────────────────────────────────────────────

export interface AssetPool {
  ownerID: string;
  assetIDs: string[];
}

/**
 * Whose photo comes up next.
 *
 * Fewest appearances first, never the same person twice running when there is
 * an alternative, never the same photo twice, weighted toward the front of each
 * ranked deck. Same rules as `RoundDealer` in the Swift package.
 */
export function deal(
  pools: AssetPool[],
  history: Round[],
  rng: Rng,
): { ownerID: string; assetID: string } | null {
  const used = new Set(history.map((r) => r.assetID));
  const lastOwner = history.length ? history[history.length - 1].ownerID : null;

  const available = pools
    .map((p) => ({ ownerID: p.ownerID, assetIDs: p.assetIDs.filter((a) => !used.has(a)) }))
    .filter((p) => p.assetIDs.length > 0);
  if (available.length === 0) return null;

  const appearances = new Map<string, number>();
  for (const r of history) appearances.set(r.ownerID, (appearances.get(r.ownerID) ?? 0) + 1);

  let eligible = available.filter((p) => p.ownerID !== lastOwner);
  if (eligible.length === 0) eligible = available;

  const fewest = Math.min(...eligible.map((p) => appearances.get(p.ownerID) ?? 0));
  const leastSeen = eligible.filter((p) => (appearances.get(p.ownerID) ?? 0) === fewest);

  const pool = rng.pick(leastSeen);

  // Triangular weighting: the top of a ranked deck is likelier, but a deck that
  // always plays its best card first gets boring by round four.
  const weights = pool.assetIDs.map((_, i) => pool.assetIDs.length - i);
  const total = weights.reduce((a, b) => a + b, 0);
  let pick = rng.double() * total;
  for (let i = 0; i < weights.length; i++) {
    pick -= weights[i];
    if (pick <= 0) return { ownerID: pool.ownerID, assetID: pool.assetIDs[i] };
  }
  return { ownerID: pool.ownerID, assetID: pool.assetIDs[pool.assetIDs.length - 1] };
}

// ─── Eligibility ─────────────────────────────────────────────────────────────

export function eligibleVoters(round: Round, players: Player[]): string[] {
  return players
    .filter((p) => p.status !== "disconnected" && p.id !== round.ownerID)
    .map((p) => p.id);
}

export function everyoneActed(round: Round, players: Player[], phase: GamePhase): boolean {
  const expected = new Set(eligibleVoters(round, players));
  if (expected.size === 0) return true;
  const done = new Set(
    phase === "answering" ? round.answers.map((a) => a.authorID) : round.votes.map((v) => v.voterID),
  );
  for (const id of expected) if (!done.has(id)) return false;
  return true;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export function pointsFor(round: Round, players: Player[]): Record<string, number> {
  if (round.status !== "complete") return {};
  const known = new Set(players.map((p) => p.id));
  const award: Record<string, number> = {};
  const bump = (id: string, n = 1) => {
    if (known.has(id)) award[id] = (award[id] ?? 0) + n;
  };

  const counts = new Map<string, string[]>();
  const key = (c: Vote["choice"]) => `${c.kind}:${c.value ?? ""}`;
  for (const v of round.votes) {
    const k = key(v.choice);
    counts.set(k, [...(counts.get(k) ?? []), v.voterID]);
  }
  const votersFor = (k: string) => counts.get(k) ?? [];
  const isMajority = (k: string) => votersFor(k).length * 2 > round.votes.length;

  switch (round.mode) {
    case "explainYourself":
      break;
    case "truthOrCap": {
      const instruction = round.secret?.instruction;
      if (!instruction) break;
      const correct = instruction === "tellTheTruth" ? "truth:" : "cap:";
      const fooled = instruction === "tellTheTruth" ? "cap:" : "truth:";
      for (const voter of votersFor(correct)) bump(voter);
      if (isMajority(fooled)) bump(round.ownerID);
      break;
    }
    case "noContext": {
      let top: { k: string; n: number } | null = null;
      let tied = false;
      for (const [k, voters] of counts) {
        if (!top || voters.length > top.n) { top = { k, n: voters.length }; tied = false; }
        else if (voters.length === top.n) tied = true;
      }
      if (top && !tied) {
        const answerID = top.k.split(":")[1];
        const author = round.answers.find((a) => a.id === answerID)?.authorID;
        if (author) bump(author);
      }
      break;
    }
    case "whoHasToExplainThis":
      for (const voter of votersFor(`player:${round.ownerID}`)) bump(voter);
      break;
  }
  return award;
}

// ─── Transitions ─────────────────────────────────────────────────────────────

const nowISO = () => new Date().toISOString();

function enterPhase(state: PrivateState, phase: GamePhase): PrivateState {
  const next: PrivateState = { ...state, phase };

  if (next.currentRound) {
    const round = { ...next.currentRound };
    if (phase === "ownerReveal") round.ownerRevealed = true;
    if (phase === "secretInstruction") round.secretDelivered = true;
    if (phase === "resultReveal") { round.resultsRevealed = true; round.ownerRevealed = true; }
    next.currentRound = round;
  }

  const seconds = phaseDuration(phase, state.settings.mode);
  next.phaseDeadline = seconds === null
    ? null
    : new Date(Date.now() + seconds * 1000).toISOString();
  next.revision = state.revision + 1;
  return next;
}

export async function beginRound(
  state: PrivateState,
  pools: AssetPool[],
  index: number,
): Promise<PrivateState> {
  if (index >= state.settings.roundCount) return finish(state, "completed");

  const rng = new Rng(state.dealerSeed, state.dealerStep);
  const dealt = deal(pools, state.completedRounds, rng);
  // Decks ran dry early. That is a finished game, not an error screen.
  if (!dealt) return finish(state, "completed");

  let secret: Round["secret"] = null;
  let commitment: Round["commitment"] = null;
  if (MODE_USES_SECRET[state.settings.mode]) {
    const instruction: SecretInstruction = rng.int(2) === 0 ? "tellTheTruth" : "lie";
    const nonce = rng.hex(16);
    secret = { instruction, nonce };
    commitment = { digest: await digest(instruction, nonce) };
  }

  const round: Round = {
    id: crypto.randomUUID(),
    index,
    mode: state.settings.mode,
    ownerID: dealt.ownerID,
    assetID: dealt.assetID,
    commitment,
    secret,
    votes: [],
    answers: [],
    status: "active",
    startedAt: nowISO(),
    ownerRevealed: false,
    secretDelivered: false,
    resultsRevealed: false,
  };

  return enterPhase(
    { ...state, roundIndex: index, currentRound: round, dealerStep: rng.step },
    "roundIntro",
  );
}

export async function advance(state: PrivateState, players: Player[], pools: AssetPool[]): Promise<PrivateState> {
  const sequence = PHASE_SEQUENCE[state.settings.mode];
  const position = sequence.indexOf(state.phase);
  if (position === -1) return state;

  const upcoming = position + 1 < sequence.length ? sequence[position + 1] : "roundComplete";
  if (upcoming === "roundComplete") return completeRound(state, players, pools);
  return enterPhase(state, upcoming);
}

async function completeRound(
  state: PrivateState,
  players: Player[],
  pools: AssetPool[],
): Promise<PrivateState> {
  if (!state.currentRound) return state;
  const round: Round = {
    ...state.currentRound,
    status: "complete",
    resultsRevealed: true,
    ownerRevealed: true,
  };

  const scores = { ...state.scores };
  for (const [id, n] of Object.entries(pointsFor(round, players))) {
    scores[id] = (scores[id] ?? 0) + n;
  }

  const next: PrivateState = {
    ...state,
    currentRound: null,
    completedRounds: [...state.completedRounds, round],
    scores,
    revision: state.revision + 1,
  };

  const nextIndex = round.index + 1;
  if (nextIndex >= state.settings.roundCount) return finish(next, "completed");
  return beginRound(next, pools, nextIndex);
}

/**
 * A round that ends without a result: the owner pulled the photo, the host
 * skipped, or the asset vanished. Scores are untouched and nothing about it is
 * kept, so removing a photo can never be inferred from the recap.
 */
export async function retireRound(
  state: PrivateState,
  players: Player[],
  pools: AssetPool[],
  status: "removedByOwner" | "skipped",
): Promise<PrivateState> {
  if (!state.currentRound) return state;
  const round: Round = { ...state.currentRound, status, votes: [], answers: [], secret: null };

  const next: PrivateState = {
    ...state,
    currentRound: null,
    completedRounds: [...state.completedRounds, round],
    revision: state.revision + 1,
  };

  const nextIndex = round.index + 1;
  if (nextIndex >= state.settings.roundCount) return finish(next, "completed");
  return beginRound(next, pools, nextIndex);
}

export function finish(state: PrivateState, reason: EndReason): PrivateState {
  return {
    ...state,
    phase: "gameComplete",
    currentRound: null,
    phaseDeadline: null,
    endedReason: reason,
    revision: state.revision + 1,
  };
}

// ─── Redaction ───────────────────────────────────────────────────────────────

/**
 * The only thing that goes onto the realtime channel.
 *
 * Built without reference to any particular reader, so it cannot leak to one
 * member something it does not also send to every other. No secret, no nonce,
 * no owner while the mode conceals one, no answer authorship before the reveal,
 * no vote totals before the result.
 */
export function publicState(state: PrivateState): Record<string, unknown> {
  const redactRound = (round: Round | null) => {
    if (!round) return null;
    return {
      id: round.id,
      index: round.index,
      mode: round.mode,
      assetID: round.assetID,
      // One flag, set by the state machine when the game reaches the reveal
      // beat. Deriving this from the mode or the phase is how the owner leaks:
      // two of the four modes run their phases out of order.
      ownerID: round.ownerRevealed ? round.ownerID : null,
      commitment: round.commitment,
      reveal: round.resultsRevealed ? round.secret : null,
      answers: round.answers.map((a) => ({
        id: a.id,
        text: a.text,
        authorID: round.resultsRevealed ? a.authorID : null,
      })),
      tally: round.resultsRevealed ? tally(round) : null,
      votedPlayerIDs: round.votes.map((v) => v.voterID).sort(),
      answeredPlayerIDs: round.answers.map((a) => a.authorID).sort(),
      status: round.status,
      startedAt: round.startedAt,
    };
  };

  return {
    roomID: state.roomID,
    settings: state.settings,
    phase: state.phase,
    roundIndex: state.roundIndex,
    currentRound: redactRound(state.currentRound),
    completedRounds: state.completedRounds.map(redactRound),
    scores: state.scores,
    revision: state.revision,
    phaseDeadline: state.phaseDeadline,
    endedReason: state.endedReason,
  };
}

function tally(round: Round) {
  const counts = new Map<string, string[]>();
  for (const v of round.votes) {
    const k = `${v.choice.kind}:${v.choice.value ?? ""}`;
    counts.set(k, [...(counts.get(k) ?? []), v.voterID]);
  }
  return {
    mode: round.mode,
    totalVotes: round.votes.length,
    counts: [...counts.entries()]
      .map(([k, voters]) => {
        const [kind, value] = k.split(":");
        return { choice: { kind, value: value || undefined }, count: voters.length, voterIDs: voters.sort() };
      })
      // Stable ordering, so two phones never draw a tie in a different order.
      .sort((a, b) => b.count - a.count || (a.choice.kind < b.choice.kind ? -1 : 1)),
  };
}

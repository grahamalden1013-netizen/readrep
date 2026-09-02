/** Verifier types + the agreement check — pure, no `server-only`, test-safe. */
export type VerifierVerdict = {
  correctTarget: boolean;
  meaningfulDecision: boolean;
  twoAlternativesVisible: boolean;
  pauseBeforeCommitment: boolean;
  outcomeVisible: boolean;
  notes: string;
};

/** True only when the independent verifier confirms every pillar. */
export function verifierAgrees(v: VerifierVerdict): boolean {
  return (
    v.correctTarget && v.meaningfulDecision && v.twoAlternativesVisible && v.pauseBeforeCommitment && v.outcomeVisible
  );
}

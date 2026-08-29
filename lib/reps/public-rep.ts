import type { Rep, SkillCategory } from "./schema";

/**
 * The shape of a rep that is safe to send to the browser before the player has
 * committed. Everything that would give the answer away is stripped out — the
 * reveal only arrives in the response to `answerRep`.
 */
export type PublicRep = {
  id: string;
  order: number;
  title: string;
  category: SkillCategory;
  difficulty: Rep["difficulty"];
  clipStartMs: number;
  decisionPauseMs: number;
  clipEndMs: number;
  situation: string;
  prompt: string;
  choices: Rep["choices"];
};

export type RepReveal = {
  repId: string;
  chosenChoiceId: string;
  isCorrect: boolean;
  correctChoiceId: string;
  actualChoiceId: string;
  actualOutcome: string;
  explanation: string;
  coachingCue: string;
};

export function toPublicRep(rep: Rep): PublicRep {
  return {
    id: rep.id,
    order: rep.order,
    title: rep.title,
    category: rep.category,
    difficulty: rep.difficulty,
    clipStartMs: rep.clipStartMs,
    decisionPauseMs: rep.decisionPauseMs,
    clipEndMs: rep.clipEndMs,
    situation: rep.situation,
    prompt: rep.prompt,
    choices: rep.choices,
  };
}

export function toReveal(rep: Rep, chosenChoiceId: string): RepReveal {
  return {
    repId: rep.id,
    chosenChoiceId,
    isCorrect: chosenChoiceId === rep.correctChoiceId,
    correctChoiceId: rep.correctChoiceId,
    actualChoiceId: rep.actualChoiceId,
    actualOutcome: rep.actualOutcome,
    explanation: rep.explanation,
    coachingCue: rep.coachingCue,
  };
}

"use server";

import { z } from "zod";
import { toReveal, type RepReveal } from "@/lib/reps/public-rep";
import { DEMO_REPS } from "@/lib/reps/seed";
import type { ActionResult } from "./result";

const inputSchema = z.object({
  repId: z.string().min(1).max(64),
  choiceId: z.string().min(1).max(16),
});

/**
 * Grades one seeded rep for the public homepage.
 *
 * The homepage has no session and records nothing, but it must still obey the
 * rule the rest of the product does: the correct answer, the actual decision
 * and the coaching text never reach the browser until a choice is committed.
 * This is the only way they get there.
 *
 * Scoped to the seeded demo reps on purpose — an anonymous visitor must not be
 * able to read the answer to somebody's uploaded film through this route.
 */
export async function revealDemoRep(input: {
  repId: string;
  choiceId: string;
}): Promise<ActionResult<RepReveal>> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That answer could not be read." };
  }

  const rep = DEMO_REPS.find((candidate) => candidate.id === parsed.data.repId);
  if (!rep) {
    return { ok: false, error: "That rep is not part of the public demo." };
  }
  if (!rep.choices.some((choice) => choice.id === parsed.data.choiceId)) {
    return { ok: false, error: "That is not one of the choices." };
  }

  return { ok: true, data: toReveal(rep, parsed.data.choiceId) };
}

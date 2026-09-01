import { z } from "zod";
import { MAX_CONFIRMED_REFERENCES, MIN_CONFIRMED_REFERENCES } from "./limits";

/**
 * One coach-confirmed sighting of the target player: the timestamp, exactly
 * where the coach clicked, a tight crop taken around that point in the browser,
 * whether the jersey number was legible at that spot, and any appearance cue.
 * The crop + adjacent frames — not the number alone — are how the analyzer
 * follows the player when they turn away.
 */
export const confirmedReferenceSchema = z.object({
  timestampSeconds: z.number().nonnegative(),
  point: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
  box: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0.02).max(1),
    h: z.number().min(0.02).max(1),
  }),
  /** Browser-made crop, base64 data URL. ~10-40 KB. Never a Mux URL. */
  crop: z
    .string()
    .regex(/^data:image\/(webp|jpeg|png);base64,/)
    .max(240_000),
  /** The coach could read the target number at this exact spot. */
  numberVisible: z.boolean(),
  jerseyColor: z.string().trim().min(2).max(24),
  appearanceCue: z.string().trim().max(120).optional(),
});

export type ConfirmedReference = z.infer<typeof confirmedReferenceSchema>;

/**
 * The gate for "Analyze game": at least MIN_CONFIRMED_REFERENCES sightings, and
 * at least one where the coach could actually read the jersey number — so the
 * app never proceeds on an identity the number never visibly supported.
 */
export const confirmedReferenceSetSchema = z
  .array(confirmedReferenceSchema)
  .min(MIN_CONFIRMED_REFERENCES)
  .max(MAX_CONFIRMED_REFERENCES)
  .refine((refs) => refs.some((r) => r.numberVisible), {
    message: "At least one reference must clearly show the jersey number.",
  });

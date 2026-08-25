import { z } from "zod";

/**
 * Identifier format shared by every ReadRep entity.
 *
 * Accepts both UUIDs and readable slugs (`coach-riley`, `moment-pnr-low-tag`).
 * Readable identifiers keep manually authored Phase 0 fixtures debuggable;
 * generated records use UUIDs, which also satisfy this pattern.
 */
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,63}$/;

/**
 * Builds a branded identifier schema.
 *
 * Branding is deliberate: it makes passing a `TeamId` where a `PlayerId` is
 * expected a compile-time error, which is the single most common way an
 * authorization check silently reads the wrong resource.
 */
export const brandedId = <B extends string>(brand: B) =>
  z
    .string()
    .regex(ID_PATTERN, {
      message: `${brand} must be a lowercase UUID or slug (3-64 chars, [a-z0-9_-])`,
    })
    .brand<B>();

/** ISO-8601 instant, always stored in UTC. */
export const Instant = z
  .string()
  .datetime({ offset: true, message: "expected an ISO-8601 timestamp" });
export type Instant = z.infer<typeof Instant>;

/** Milliseconds from the start of a video asset. */
export const TimestampMs = z
  .number()
  .int({ message: "video timestamps are whole milliseconds" })
  .nonnegative();
export type TimestampMs = z.infer<typeof TimestampMs>;

/**
 * A half-open window `[startMs, endMs)` within a single video asset.
 *
 * Every AI-derived claim must cite a clip range. A claim that cannot point at
 * a window of film is not evidence, it is assertion.
 */
export const ClipRange = z
  .object({
    startMs: TimestampMs,
    endMs: TimestampMs,
  })
  .refine((r) => r.endMs > r.startMs, {
    message: "clip range must end after it starts",
    path: ["endMs"],
  });
export type ClipRange = z.infer<typeof ClipRange>;

export const clipRangeDurationMs = (range: ClipRange): number =>
  range.endMs - range.startMs;

export const clipRangeContains = (range: ClipRange, at: number): boolean =>
  at >= range.startMs && at < range.endMs;

/** Normalized court position, `0..1` on each axis relative to the frame. */
export const NormalizedPoint = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export type NormalizedPoint = z.infer<typeof NormalizedPoint>;

/** Normalized bounding box within a frame. */
export const BoundingBox = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0).max(1),
    height: z.number().min(0).max(1),
  })
  .refine((b) => b.x + b.width <= 1.0000001 && b.y + b.height <= 1.0000001, {
    message: "bounding box must stay inside the frame",
  });
export type BoundingBox = z.infer<typeof BoundingBox>;

/** Version marker for anything whose meaning can change over time. */
export const SemanticVersion = z.string().regex(/^\d+\.\d+\.\d+$/, {
  message: "expected a semantic version such as 1.0.0",
});
export type SemanticVersion = z.infer<typeof SemanticVersion>;

/** Monotonic revision counter for coach systems and rules. */
export const RevisionNumber = z.number().int().positive();
export type RevisionNumber = z.infer<typeof RevisionNumber>;

/** Non-empty single-line text with a bounded length. */
export const shortText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[^\n\r]*$/, {
      message: "expected a single line of text",
    });

/** Non-empty multi-line text with a bounded length. */
export const longText = (max: number) => z.string().trim().min(1).max(max);

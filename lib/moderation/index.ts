import type { ModerationStatus } from "@/types/ngn";

/**
 * Moderation architecture.
 *
 * NGN hosts discussion between people who may be minors, so every piece of
 * user content carries a moderation status and every submission passes through
 * here before it is stored. Today this runs deterministic checks; the same
 * interface is where an AI classifier gets plugged in.
 */

export type ModerationReason =
  | "personal-attack"
  | "slur"
  | "personal-information"
  | "spam"
  | "off-topic"
  | "unreviewed";

export interface ModerationVerdict {
  status: ModerationStatus;
  reasons: ModerationReason[];
  /** Message shown to the author when their post is held. */
  message?: string;
}

/** The reminder shown before anyone posts. */
export const DISCUSSION_REMINDER = "Challenge ideas, not people.";

const ATTACK_PATTERNS = [
  /\byou(?:'re| are)\s+(?:an?\s+)?(?:idiot|stupid|moron|dumb)\b/i,
  /\bshut up\b/i,
  /\bno one asked\b/i,
];

const PERSONAL_INFO_PATTERNS = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // phone number
  /\b[\w.+-]+@[\w-]+\.[\w.]+\b/, // email address
  /\b\d{1,5}\s+[A-Za-z]+\s+(?:street|st|avenue|ave|road|rd|lane|ln)\b/i,
];

const SPAM_PATTERNS = [/https?:\/\/\S+/i, /\b(?:buy now|click here|promo code)\b/i];

/**
 * Screen a submission. Returns the status the record should be stored with.
 *
 * Nothing is silently discarded: content is held for review rather than
 * deleted, and the author is told why.
 */
export function screenSubmission(body: string): ModerationVerdict {
  const reasons: ModerationReason[] = [];
  const trimmed = body.trim();

  if (ATTACK_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    reasons.push("personal-attack");
  }
  if (PERSONAL_INFO_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    reasons.push("personal-information");
  }
  if (SPAM_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    reasons.push("spam");
  }

  if (reasons.includes("personal-information")) {
    return {
      status: "flagged",
      reasons,
      message:
        "This post looks like it contains contact information. NGN removes personal details because many readers here are minors. Edit it and try again.",
    };
  }

  if (reasons.length > 0) {
    return {
      status: "pending",
      reasons,
      message:
        "This is held for review. Challenge ideas, not people — rewriting the argument without the personal part is usually enough.",
    };
  }

  if (trimmed.length < 12) {
    return {
      status: "pending",
      reasons: ["off-topic"],
      message:
        "Very short replies are held for review. Add a sentence about why you think that.",
    };
  }

  return { status: "approved", reasons: [] };
}

/**
 * Hook for an AI classifier. Kept separate from `screenSubmission` so the
 * deterministic checks always run, even if the classifier is unavailable.
 */
export async function classifyWithAi(body: string): Promise<ModerationVerdict> {
  const deterministic = screenSubmission(body);
  if (!process.env.ANTHROPIC_API_KEY) return deterministic;

  // Connect a Claude moderation call here. Until then the deterministic
  // verdict stands — failing open to "approved" would be the wrong default.
  return deterministic;
}

export const MODERATION_STATUS_LABEL: Record<ModerationStatus, string> = {
  approved: "Visible",
  pending: "Held for review",
  flagged: "Flagged",
  removed: "Removed",
};

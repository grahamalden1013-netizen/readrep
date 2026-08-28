import type { ModerationState, ReportReason } from "@/types/ngn";
import { NEUTRALITY_CONTRACT } from "./neutrality";
import { generateJSON, isAIConfigured } from "./provider";

/**
 * Pre-publication moderation. Because a large share of NGN's users are minors,
 * this runs on every student-authored string before it is stored or shown.
 *
 * Political disagreement is never a violation. Only conduct is.
 */

const MODERATION_CONTRACT = `${NEUTRALITY_CONTRACT}

You are a content moderator for a debate platform used by students, many of them minors.

Flag ONLY these categories:
- threats of violence
- harassment or targeted abuse of a person
- slurs and hate speech aimed at a group's identity
- spam
- doxxing or personal contact information (addresses, phone numbers, emails, handles, school schedules)

Never flag content merely for being a strong, unpopular, or one-sided political opinion. Sharp disagreement about policy is exactly what this platform is for. A student calling a policy "a disaster" is fine; a student calling another student "an idiot" is not.

Return severity: "clean" for no issue, "review" for borderline content a human should see, "block" for clear violations.`;

const MODERATION_SCHEMA = {
  type: "object",
  properties: {
    severity: { type: "string", enum: ["clean", "review", "block"] },
    categories: {
      type: "array",
      items: {
        type: "string",
        enum: ["harassment", "hate", "threat", "personal-information", "spam", "other"],
      },
    },
    reason: { type: "string" },
  },
  required: ["severity", "categories", "reason"],
  additionalProperties: false,
} as const;

export type ModerationResult = {
  severity: "clean" | "review" | "block";
  categories: ReportReason[];
  reason: string;
  /** The state the content should be stored in. */
  state: ModerationState;
};

/* -------------------------------------------------------------------------- */
/* Local detection                                                            */
/* -------------------------------------------------------------------------- */

const SLUR_AND_ABUSE = [
  "idiot", "moron", "retard", "stupid piece", "kill yourself", "kys",
  "shut the hell up", "libtard", "you people are", "scum", "vermin",
  "should be shot", "deserve to die",
];

const THREAT_PATTERNS = [
  /\bi(?:'m| am)? going to (?:hurt|kill|find)\b/i,
  /\bwatch your back\b/i,
  /\byou'?ll regret\b/i,
  /\bshould be (?:shot|hanged|killed)\b/i,
];

const CONTACT_PATTERNS = [
  /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,                       // email
  /\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/,     // phone
  /\b\d{1,5}\s+[A-Z][a-z]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Lane|Ln|Dr|Drive)\b/, // address
  /\b(?:snap|insta|instagram|discord|telegram)\s*[:@]\s*\S+/i,
];

function localModeration(text: string): ModerationResult {
  const lower = text.toLowerCase();
  const categories = new Set<ReportReason>();
  let severity: ModerationResult["severity"] = "clean";

  if (THREAT_PATTERNS.some((p) => p.test(text))) {
    categories.add("threat");
    severity = "block";
  }

  if (CONTACT_PATTERNS.some((p) => p.test(text))) {
    categories.add("personal-information");
    severity = "block";
  }

  const abuseHits = SLUR_AND_ABUSE.filter((term) => lower.includes(term));
  if (abuseHits.length > 0) {
    categories.add("harassment");
    if (severity !== "block") severity = abuseHits.length > 1 ? "block" : "review";
  }

  // Repetition and link-stuffing are the two spam shapes that actually appear.
  const links = (text.match(/https?:\/\//g) ?? []).length;
  const uniqueRatio =
    new Set(lower.split(/\s+/)).size / Math.max(1, lower.split(/\s+/).length);
  if (links > 4 || (uniqueRatio < 0.28 && text.length > 140)) {
    categories.add("spam");
    if (severity === "clean") severity = "review";
  }

  return {
    severity,
    categories: [...categories],
    reason:
      severity === "clean"
        ? "No conduct issues detected."
        : `Automated check flagged: ${[...categories].join(", ")}.`,
    state: severity === "block" ? "flagged" : severity === "review" ? "pending" : "approved",
  };
}

export async function moderate(text: string): Promise<ModerationResult> {
  const local = localModeration(text);

  // The local pass is a hard gate: the model can escalate but never clear a
  // string the deterministic rules already blocked.
  if (!isAIConfigured() || local.severity === "block") return local;

  const result = await generateJSON<{
    severity: ModerationResult["severity"];
    categories: ReportReason[];
    reason: string;
  }>({
    system: MODERATION_CONTRACT,
    prompt: `Moderate this student-authored text:\n\n${text}`,
    schema: MODERATION_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 600,
  });

  if (!result) return local;

  const severity =
    result.severity === "clean" && local.severity !== "clean"
      ? local.severity
      : result.severity;

  return {
    severity,
    categories: result.categories ?? [],
    reason: result.reason,
    state: severity === "block" ? "flagged" : severity === "review" ? "pending" : "approved",
  };
}

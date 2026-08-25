/**
 * Redaction rules for everything ReadRep logs.
 *
 * ReadRep handles game video of minors, so the logger is a privacy control,
 * not a convenience. It redacts by default: a caller has to work to leak
 * something, rather than working to protect it.
 *
 * Two independent passes run on every field:
 *   1. Key-based — a field named `email` is redacted whatever it contains.
 *   2. Value-based — a string that looks like a URL, token, or email address is
 *      redacted whatever it is called. This catches the case that key-based
 *      redaction always misses: `detail: "failed to fetch https://...?token=."`
 */

/** Field names that must never appear in a log line, matched case-insensitively. */
const SENSITIVE_KEY_PATTERN =
  /(pass(word|phrase)?|secret|token|api[-_]?key|auth|credential|cookie|session|signature|bearer|private[-_]?key|email|phone|address|full[-_]?name|first[-_]?name|last[-_]?name|display[-_]?name|player[-_]?name|guardian|dob|birth|url|uri|href|src|storage[-_]?key|playback[-_]?id|upload[-_]?id|asset[-_]?id|ip[-_]?address|user[-_]?agent|note|reflection|missed[-_]?cue|transcript|prompt[-_]?text)/i;

/** Value shapes that are sensitive no matter what field they arrive in. */
const SENSITIVE_VALUE_PATTERNS: readonly RegExp[] = [
  /\bhttps?:\/\/\S+/i, // any URL, including signed provider URLs
  /\bdata:[a-z]+\/[a-z0-9.+-]+;base64,/i, // inline media
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // email address
  /\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{8,}/, // provider secret key shapes
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access key id
  /\/[\w.-]+\.(mp4|mov|m4v|mkv|webm|m3u8|jpg|jpeg|png|webp)\b/i, // media paths
];

export const REDACTED = "[redacted]";

/** Values a log field may hold. Structures are flattened by the caller. */
export type LoggableValue = string | number | boolean | null;

export type LoggableFields = Readonly<Record<string, LoggableValue>>;

const isSensitiveKey = (key: string): boolean => SENSITIVE_KEY_PATTERN.test(key);

const isSensitiveValue = (value: string): boolean =>
  SENSITIVE_VALUE_PATTERNS.some((p) => p.test(value));

/** Longest string kept in a log field before truncation. */
const MAX_STRING_LENGTH = 300;

export const redactValue = (key: string, value: LoggableValue): LoggableValue => {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return isSensitiveKey(key) ? REDACTED : value;
  }
  if (isSensitiveKey(key)) return REDACTED;
  if (isSensitiveValue(value)) return REDACTED;
  return value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`
    : value;
};

/**
 * Redacts a whole field set.
 *
 * Nested objects and arrays are rejected rather than walked: a log call that
 * wants to pass a record is a log call that will eventually pass a player's
 * name. Callers pick the scalar fields they mean.
 */
export const redactFields = (
  fields: Readonly<Record<string, unknown>>,
): LoggableFields => {
  const out: Record<string, LoggableValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      out[key] = "[unloggable:non-scalar]";
      continue;
    }
    out[key] = redactValue(key, value);
  }
  return out;
};

/**
 * Reduces an error to something safe to log.
 *
 * Messages routinely contain file paths, signed URLs, and provider responses,
 * so the message goes through value redaction. Stacks are never logged: they
 * carry absolute paths and, in a bundled server, occasionally request data.
 */
export const redactError = (error: unknown): LoggableFields => {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: redactValue("message", error.message),
    };
  }
  return { errorName: "UnknownError", errorMessage: REDACTED };
};

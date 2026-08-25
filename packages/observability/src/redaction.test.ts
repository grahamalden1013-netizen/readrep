import { describe, expect, it } from "vitest";
import { createLogger, type LogRecord } from "./logger.js";
import { REDACTED, redactError, redactFields, redactValue } from "./redaction.js";
import { createInMemoryMetricsSink, formatMicroUsd } from "./cost.js";

describe("key-based redaction", () => {
  const cases = [
    "email",
    "userEmail",
    "fullName",
    "full_name",
    "displayName",
    "playerName",
    "apiKey",
    "api_key",
    "accessToken",
    "sessionSecret",
    "password",
    "cookie",
    "signature",
    "storageKey",
    "playbackId",
    "videoUrl",
    "src",
    "href",
    "ipAddress",
    "userAgent",
    "missedCue",
    "reflection",
    "note",
  ];

  it.each(cases)("redacts a field named %s", (key) => {
    expect(redactValue(key, "anything at all")).toBe(REDACTED);
  });

  it("keeps identifiers and counts, which are what diagnostics actually need", () => {
    expect(redactValue("gameId", "game-123")).toBe("game-123");
    expect(redactValue("stage", "transcoding")).toBe("transcoding");
    expect(redactValue("attempts", 3)).toBe(3);
    expect(redactValue("retryable", true)).toBe(true);
  });
});

describe("value-based redaction", () => {
  it("redacts a URL wherever it appears", () => {
    expect(
      redactValue("detail", "fetch failed for https://stream.example/abc.m3u8"),
    ).toBe(REDACTED);
  });

  it("redacts an email address in a free-text field", () => {
    expect(redactValue("detail", "no account for parent@example.com")).toBe(REDACTED);
  });

  it("redacts a JWT", () => {
    expect(
      redactValue("detail", "token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0"),
    ).toBe(REDACTED);
  });

  it("redacts provider secret key shapes", () => {
    expect(redactValue("detail", "using sk_live_abcdef123456")).toBe(REDACTED);
    expect(redactValue("detail", "AKIAIOSFODNN7EXAMPLE")).toBe(REDACTED);
  });

  it("redacts media file paths", () => {
    expect(redactValue("detail", "wrote /var/data/frames/game1.jpg")).toBe(REDACTED);
    expect(redactValue("detail", "reading /uploads/second-half.mp4")).toBe(REDACTED);
  });

  it("truncates long strings rather than logging them whole", () => {
    const long = "a".repeat(500);
    const result = redactValue("detail", long);
    expect(String(result)).toHaveLength(300 + "...[truncated]".length);
    expect(String(result).endsWith("...[truncated]")).toBe(true);
  });
});

describe("field sets", () => {
  it("refuses to serialize nested structures", () => {
    const result = redactFields({ player: { fullName: "A Name" }, ok: true });
    expect(result.player).toBe("[unloggable:non-scalar]");
    expect(result.ok).toBe(true);
  });

  it("drops undefined rather than emitting null", () => {
    expect(Object.keys(redactFields({ a: undefined, b: 1 }))).toEqual(["b"]);
  });
});

describe("errors", () => {
  it("logs the name and a redacted message, never a stack", () => {
    const result = redactError(new Error("failed to reach https://provider.example/x"));
    expect(result.errorName).toBe("Error");
    expect(result.errorMessage).toBe(REDACTED);
    expect(Object.keys(result)).not.toContain("stack");
  });

  it("handles a thrown non-error without leaking it", () => {
    expect(redactError({ secret: "value" })).toEqual({
      errorName: "UnknownError",
      errorMessage: REDACTED,
    });
  });
});

describe("logger", () => {
  const capture = () => {
    const records: LogRecord[] = [];
    const logger = createLogger({
      component: "test",
      level: "debug",
      sink: (r) => records.push(r),
      now: () => new Date("2026-08-25T12:00:00.000Z"),
    });
    return { records, logger };
  };

  it("redacts fields on the way through", () => {
    const { records, logger } = capture();
    logger.info("playback authorized", {
      gameId: "game-1",
      playbackId: "abc123",
      viewerEmail: "coach@example.com",
    });
    expect(records[0]?.fields).toEqual({
      gameId: "game-1",
      playbackId: REDACTED,
      viewerEmail: REDACTED,
    });
  });

  it("honours the level threshold", () => {
    const records: LogRecord[] = [];
    const logger = createLogger({
      component: "test",
      level: "warn",
      sink: (r) => records.push(r),
    });
    logger.debug("noise");
    logger.info("noise");
    logger.warn("kept");
    logger.error("kept");
    expect(records.map((r) => r.level)).toEqual(["warn", "error"]);
  });

  it("carries redacted base fields into children", () => {
    const { records, logger } = capture();
    logger.child("dal", { teamId: "team-a", coachEmail: "c@example.com" }).info("read");
    expect(records[0]?.component).toBe("test.dal");
    expect(records[0]?.fields.teamId).toBe("team-a");
    expect(records[0]?.fields.coachEmail).toBe(REDACTED);
  });
});

describe("cost records", () => {
  it("totals micro-USD as integers", () => {
    const sink = createInMemoryMetricsSink();
    sink.recordCost({
      category: "model_inference",
      subjectId: "op-1",
      gameId: "game-1",
      teamId: "team-a",
      amountMicroUsd: 12_500,
      quantity: 1800,
      unit: "tokens",
      occurredAt: "2026-08-25T12:00:00.000Z",
    });
    sink.recordCost({
      category: "gpu_compute",
      subjectId: "run-1",
      gameId: "game-1",
      teamId: "team-a",
      amountMicroUsd: 900_000,
      quantity: 120,
      unit: "gpu_seconds",
      occurredAt: "2026-08-25T12:01:00.000Z",
    });
    expect(sink.totalMicroUsd()).toBe(912_500);
  });

  it("formats small and large amounts differently", () => {
    expect(formatMicroUsd(1_500)).toBe("$0.0015");
    expect(formatMicroUsd(2_500_000)).toBe("$2.50");
  });
});

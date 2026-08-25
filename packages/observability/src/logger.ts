import { type LoggableFields, redactError, redactFields } from "./redaction";

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type LogRecord = {
  level: LogLevel;
  message: string;
  component: string;
  at: string;
  fields: LoggableFields;
};

/** Where records go. Swappable so tests can assert on what would be emitted. */
export type LogSink = (record: LogRecord) => void;

export const consoleSink: LogSink = (record) => {
  const line = JSON.stringify(record);
  if (record.level === "error") console.error(line);
  else console.warn(line);
};

export type Logger = {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, error?: unknown, fields?: Record<string, unknown>): void;
  /** Derives a logger that adds fixed fields to every record. */
  child(component: string, fields?: Record<string, unknown>): Logger;
};

export type LoggerOptions = {
  component: string;
  level?: LogLevel;
  sink?: LogSink;
  now?: () => Date;
  baseFields?: Record<string, unknown>;
};

/**
 * Creates a structured logger that redacts every field it is given.
 *
 * The message itself is treated as developer-authored and is not redacted, so
 * messages must be static strings. Anything variable belongs in `fields`, where
 * it is redacted. This is the one rule that makes the logger trustworthy.
 */
export const createLogger = (options: LoggerOptions): Logger => {
  const level = options.level ?? "info";
  const sink = options.sink ?? consoleSink;
  const now = options.now ?? (() => new Date());
  const base = redactFields(options.baseFields ?? {});

  const emit = (
    recordLevel: LogLevel,
    message: string,
    fields: Record<string, unknown>,
  ): void => {
    if (LEVEL_RANK[recordLevel] < LEVEL_RANK[level]) return;
    sink({
      level: recordLevel,
      message,
      component: options.component,
      at: now().toISOString(),
      fields: { ...base, ...redactFields(fields) },
    });
  };

  return {
    debug: (m, f = {}) => emit("debug", m, f),
    info: (m, f = {}) => emit("info", m, f),
    warn: (m, f = {}) => emit("warn", m, f),
    error: (m, error, f = {}) => emit("error", m, { ...f, ...redactError(error) }),
    child: (component, fields = {}) =>
      createLogger({
        ...options,
        component: `${options.component}.${component}`,
        baseFields: { ...(options.baseFields ?? {}), ...fields },
      }),
  };
};

/** A logger that discards everything. Useful in tests and pure functions. */
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => nullLogger,
};

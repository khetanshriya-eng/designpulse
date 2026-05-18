/**
 * Minimal structured logger.
 *
 * Vercel ingests stdout/stderr into the Logs UI and lets you query by JSON
 * fields if the line is JSON. So in production (`NODE_ENV=production`) we
 * emit one JSON object per log line; locally we keep the existing single-
 * line console format because it's easier to scan.
 *
 * Usage:
 *   const log = logger("cron.fetch");
 *   log.info("starting", { sources: 60 });
 *   log.warn("source failed", { slug, error });
 *   log.error("aborted", { error });
 *
 * Each call also returns the line as a string so a route handler can include
 * it in the response body (`{ logs: [...] }`) for ad-hoc debugging.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";

function shouldEmit(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

function format(
  scope: string,
  level: LogLevel,
  msg: string,
  meta?: Record<string, unknown>
): string {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify({
      level,
      scope,
      msg,
      ts: new Date().toISOString(),
      ...meta,
    });
  }
  const tag = `[${level}] ${scope}:`;
  if (!meta || Object.keys(meta).length === 0) return `${tag} ${msg}`;
  return `${tag} ${msg} ${JSON.stringify(meta)}`;
}

export type Logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
};

export function logger(scope: string): Logger {
  function emit(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
    if (!shouldEmit(level)) return;
    const line = format(scope, level, msg, meta);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }
  return {
    debug: (m, x) => emit("debug", m, x),
    info: (m, x) => emit("info", m, x),
    warn: (m, x) => emit("warn", m, x),
    error: (m, x) => emit("error", m, x),
  };
}

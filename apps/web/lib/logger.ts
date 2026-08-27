/**
 * MINDCRAFT — Production Structured JSON Logger
 * Formats all application logs as structured JSON for easy ingestion into
 * stdout, Loki, CloudWatch, Datadog, or Grafana with zero external dependencies.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  context?: string;
  durationMs?: number;
  metadata?: Record<string, any>;
}

function formatLog(level: LogLevel, message: string, meta?: {
  requestId?: string;
  context?: string;
  durationMs?: number;
  [key: string]: any;
}): string {
  const { requestId, context, durationMs, ...extra } = meta || {};
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(requestId && { requestId }),
    ...(context && { context }),
    ...(durationMs !== undefined && { durationMs }),
    ...(Object.keys(extra).length > 0 && { metadata: extra }),
  };

  return JSON.stringify(payload);
}

export const logger = {
  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLog("debug", message, meta));
    }
  },
  info: (message: string, meta?: Record<string, any>) => {
    console.log(formatLog("info", message, meta));
  },
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(formatLog("warn", message, meta));
  },
  error: (message: string, meta?: Record<string, any>) => {
    console.error(formatLog("error", message, meta));
  },
};

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

let logFilePath: string | undefined;

function normalizeLogPayload(payload: unknown): unknown {
  if (payload instanceof Error) {
    return {
      name: payload.name,
      message: payload.message,
      stack: payload.stack
    };
  }

  return payload;
}

/**
 * Enables a local file sink for desktop diagnostics.
 */
export function initializeFileLogging(path: string): void {
  logFilePath = path;
  mkdirSync(dirname(path), { recursive: true });
}

function appendToLogFile(level: "INFO" | "ERROR", scope: string, message: string, payload?: unknown): void {
  if (!logFilePath) {
    return;
  }

  const timestamp = new Date().toISOString();
  const normalizedPayload = normalizeLogPayload(payload);
  const serializedPayload =
    normalizedPayload === undefined
      ? ""
      : ` ${typeof normalizedPayload === "string" ? normalizedPayload : JSON.stringify(normalizedPayload, null, 2)}`;

  appendFileSync(logFilePath, `[${timestamp}] [${level}] [${scope}] ${message}${serializedPayload}\n`, "utf8");
}

/**
 * Minimal logger for the desktop shell. Keep this tiny until there is enough
 * real behavior to justify structured sinks.
 */
export function log(scope: string, message: string, payload?: unknown): void {
  const prefix = `[desktop:${scope}]`;
  const normalizedPayload = normalizeLogPayload(payload);
  appendToLogFile("INFO", scope, message, normalizedPayload);
  if (normalizedPayload === undefined) {
    console.log(prefix, message);
    return;
  }
  console.log(prefix, message, normalizedPayload);
}

/**
 * Logs a recoverable error without throwing away the caller stack.
 */
export function logError(scope: string, message: string, error: unknown): void {
  const normalizedError = normalizeLogPayload(error);
  appendToLogFile("ERROR", scope, message, normalizedError);
  console.error(`[desktop:${scope}]`, message, normalizedError);
}

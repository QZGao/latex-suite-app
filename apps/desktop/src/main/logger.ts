import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

let logFilePath: string | undefined;

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
  const serializedPayload =
    payload === undefined
      ? ""
      : ` ${typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)}`;

  appendFileSync(logFilePath, `[${timestamp}] [${level}] [${scope}] ${message}${serializedPayload}\n`, "utf8");
}

/**
 * Minimal logger for the desktop shell. Keep this tiny until there is enough
 * real behavior to justify structured sinks.
 */
export function log(scope: string, message: string, payload?: unknown): void {
  const prefix = `[desktop:${scope}]`;
  appendToLogFile("INFO", scope, message, payload);
  if (payload === undefined) {
    console.log(prefix, message);
    return;
  }
  console.log(prefix, message, payload);
}

/**
 * Logs a recoverable error without throwing away the caller stack.
 */
export function logError(scope: string, message: string, error: unknown): void {
  appendToLogFile("ERROR", scope, message, error);
  console.error(`[desktop:${scope}]`, message, error);
}

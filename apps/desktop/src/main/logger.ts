/**
 * Minimal logger for the desktop shell. Keep this tiny until there is enough
 * real behavior to justify structured sinks.
 */
export function log(scope: string, message: string, payload?: unknown): void {
  const prefix = `[desktop:${scope}]`;
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
  console.error(`[desktop:${scope}]`, message, error);
}

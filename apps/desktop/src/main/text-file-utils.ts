import { readFileSync } from "node:fs";

/**
 * Reads a text file when the path is configured and readable.
 */
export function readOptionalTextFile(path?: string): string | undefined {
  if (!path) {
    return undefined;
  }

  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

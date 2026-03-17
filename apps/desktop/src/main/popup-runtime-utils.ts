import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Prefer a CommonJS preload bundle because Electron executes it reliably in
 * packaged builds. Keep older output names as fallbacks so local builds and
 * existing artifacts do not silently break the popup bootstrap path again.
 */
export function resolvePreloadEntryPath(mainDirectory: string): string {
  return resolvePreloadEntryPathWithExists(mainDirectory, existsSync);
}

/**
 * Same resolution logic as `resolvePreloadEntryPath`, with an injectable file
 * existence probe for unit testing.
 */
export function resolvePreloadEntryPathWithExists(
  mainDirectory: string,
  exists: (path: string) => boolean
): string {
  const candidatePaths = [
    join(mainDirectory, "../preload/index.cjs"),
    join(mainDirectory, "../preload/index.mjs"),
    join(mainDirectory, "../preload/index.js")
  ];

  for (const candidatePath of candidatePaths) {
    if (exists(candidatePath)) {
      return candidatePath;
    }
  }

  return candidatePaths[0]!;
}

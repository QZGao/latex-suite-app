import { app } from "electron";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "@latex-suite/contracts";
import { logError } from "./logger.js";

function getSettingsPath(): string {
  return join(app.getPath("userData"), "settings.json");
}

/**
 * Thin JSON-backed settings store. Validation stays explicit and local.
 */
export class SettingsStore {
  load(): AppSettings {
    const path = getSettingsPath();

    try {
      const raw = readFileSync(path, "utf8");
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        ...DEFAULT_APP_SETTINGS,
        ...parsed,
        popup: {
          ...DEFAULT_APP_SETTINGS.popup,
          ...(parsed.popup ?? {})
        },
        snippets: {
          ...DEFAULT_APP_SETTINGS.snippets,
          ...(parsed.snippets ?? {})
        },
        adapters: {
          ...DEFAULT_APP_SETTINGS.adapters,
          ...(parsed.adapters ?? {})
        }
      };
    } catch (error) {
      logError("settings", "Falling back to default settings.", error);
      return DEFAULT_APP_SETTINGS;
    }
  }

  save(settings: AppSettings): void {
    const path = getSettingsPath();
    const tempPath = `${path}.tmp`;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(tempPath, JSON.stringify(settings, null, 2), "utf8");
    renameSync(tempPath, path);
  }
}

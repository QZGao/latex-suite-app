import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "@latex-suite/contracts";
import { app } from "./electron-main.js";
import { logError } from "./logger.js";
import defaultSnippetSource from "../../../../vendors/latex-suite-core/src/default_snippets.js?raw";
import defaultSnippetVariableSource from "../../../../vendors/latex-suite-core/src/default_snippet_variables.js?raw";

function resolveDefaultSnippetFilePaths(): {
  userSnippetFile: string;
  userVariableFile: string;
} {
  const snippetsDirectory = join(app.getPath("userData"), "snippets");
  return {
    userSnippetFile: join(snippetsDirectory, "user-snippets.js"),
    userVariableFile: join(snippetsDirectory, "user-variables.js")
  };
}

function getSettingsPath(): string {
  return join(app.getPath("userData"), "settings.json");
}

function coerceString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function ensureUserSnippetFile(path: string, fallbackContent: string): void {
  if (existsSync(path)) {
    return;
  }

  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, fallbackContent, "utf8");
  } catch (error) {
    logError("settings", "Failed to initialize user snippet file.", error);
  }
}

function resolveSnippetPaths(parsed: Partial<AppSettings>): {
  userSnippetFile: string;
  userVariableFile: string;
} {
  const defaultSnippetFiles = resolveDefaultSnippetFilePaths();
  const userSnippetFile = coerceString(parsed.snippets?.userSnippetFile) ?? defaultSnippetFiles.userSnippetFile;
  const userVariableFile = coerceString(parsed.snippets?.userVariableFile) ?? defaultSnippetFiles.userVariableFile;

  ensureUserSnippetFile(userSnippetFile, defaultSnippetSource);
  ensureUserSnippetFile(userVariableFile, defaultSnippetVariableSource);

  return {
    userSnippetFile,
    userVariableFile
  };
}

/**
 * Thin JSON-backed settings store. Validation stays explicit and local.
 */
export class SettingsStore {
  load(): AppSettings {
    const path = getSettingsPath();
    const defaultSnippetFiles = resolveDefaultSnippetFilePaths();

    try {
      const raw = readFileSync(path, "utf8");
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      const snippetPaths = resolveSnippetPaths(parsed);
      return {
        ...DEFAULT_APP_SETTINGS,
        ...parsed,
        popup: {
          ...DEFAULT_APP_SETTINGS.popup,
          ...(parsed.popup ?? {})
        },
        snippets: {
          ...DEFAULT_APP_SETTINGS.snippets,
          ...defaultSnippetFiles,
          ...(parsed.snippets ?? {}),
          ...snippetPaths
        }
      };
    } catch (error) {
      logError("settings", "Falling back to default settings.", error);
      ensureUserSnippetFile(defaultSnippetFiles.userSnippetFile, defaultSnippetSource);
      ensureUserSnippetFile(defaultSnippetFiles.userVariableFile, defaultSnippetVariableSource);
      return {
        ...DEFAULT_APP_SETTINGS,
        snippets: {
          ...DEFAULT_APP_SETTINGS.snippets,
          ...defaultSnippetFiles
        }
      };
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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { BrowserWindow as BrowserWindowType } from "electron/main";
import { dirname, join } from "node:path";
import type { AppSettings } from "@latex-suite/contracts";
import {
  SETTINGS_IPC_CHANNELS,
  type DesktopSettingsSaveResult,
  type OpenPathPayload,
  type OpenPathResult,
  type ShortcutCaptureStatePayload,
  type UpdateDesktopSettingsPayload
} from "../shared/settings-payload.js";
import { BrowserWindow, ipcMain, shell } from "./electron-main.js";
import { log, logError } from "./logger.js";
import { resolvePreloadEntryPath } from "./popup-runtime-utils.js";
import defaultSnippetSource from "../../../../vendors/latex-suite-core/src/default_snippets.js?raw";
import defaultSnippetVariableSource from "../../../../vendors/latex-suite-core/src/default_snippet_variables.js?raw";

export interface SettingsWindowHandlers {
  getSettings: () => AppSettings;
  saveSettings: (payload: UpdateDesktopSettingsPayload) => DesktopSettingsSaveResult;
  setShortcutCaptureActive: (active: boolean) => void;
}

function normalizeOpenPath(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const candidate = (payload as OpenPathPayload).path;
  return typeof candidate === "string" ? candidate.trim() : undefined;
}

async function openPathWithDefaultApp(payload: unknown): Promise<OpenPathResult> {
  const normalizedPath = normalizeOpenPath(payload);
  if (!normalizedPath) {
    return {
      ok: false,
      error: "Missing path."
    };
  }

  try {
    mkdirSync(dirname(normalizedPath), { recursive: true });

    const hasContent = (() => {
      try {
        if (!existsSync(normalizedPath)) {
          return false;
        }

        return readFileSync(normalizedPath, "utf8").trim().length > 0;
      } catch (error) {
        return false;
      }
    })();

    if (!hasContent) {
      const normalizedLower = normalizedPath.toLowerCase();
      const isSnippetPath = normalizedLower.endsWith("user-snippets.js");
      const isVariablePath = normalizedLower.endsWith("user-variables.js");

      writeFileSync(
        normalizedPath,
        isSnippetPath ? defaultSnippetSource : isVariablePath ? defaultSnippetVariableSource : "",
        "utf8"
      );
    }

    const result = await shell.openPath(normalizedPath);
    if (result) {
      return {
        ok: false,
        error: result
      };
    }

    return {
      ok: true
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function attachSettingsDiagnostics(window: BrowserWindow): void {
  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl) => {
    logError("settings", "Settings renderer failed to load.", {
      errorCode,
      errorDescription,
      validatedUrl
    });
  });

  window.webContents.on("preload-error", (_event, preloadPath, error) => {
    logError("settings", "Settings preload failed to load.", {
      preloadPath,
      error: error.message
    });
  });

  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    log("settings:renderer", message, {
      level,
      line,
      sourceId
    });
  });
}

export class SettingsWindowService {
  private window?: BrowserWindowType;

  constructor(private readonly handlers: SettingsWindowHandlers) {
    ipcMain.handle(SETTINGS_IPC_CHANNELS.getSettings, () => {
      const settings = this.handlers.getSettings();

      return {
        shortcut: settings.shortcut,
        launchAtLogin: settings.launchAtLogin,
        defaultInteractionProfile: settings.defaultInteractionProfile,
        snippets: {
          userSnippetFile: settings.snippets.userSnippetFile,
          userVariableFile: settings.snippets.userVariableFile
        }
      };
    });
    ipcMain.handle(SETTINGS_IPC_CHANNELS.saveSettings, (_event, payload: UpdateDesktopSettingsPayload) =>
      this.handlers.saveSettings(payload)
    );
    ipcMain.handle(
      SETTINGS_IPC_CHANNELS.openPath,
      (_event, payload: OpenPathPayload) => openPathWithDefaultApp(payload)
    );
    ipcMain.on(
      SETTINGS_IPC_CHANNELS.setShortcutCaptureState,
      (event, payload: ShortcutCaptureStatePayload) => {
        this.handlers.setShortcutCaptureActive(payload.active);
        event.returnValue = null;
      }
    );
  }

  show(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show();
      this.window.focus();
      return;
    }

    const preloadPath = resolvePreloadEntryPath(__dirname);
    const window = new BrowserWindow({
      width: 680,
      height: 520,
      minWidth: 520,
      minHeight: 400,
      show: false,
      autoHideMenuBar: true,
      resizable: true,
      fullscreenable: false,
      backgroundColor: "#ffffff",
      title: "Settings",
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this.window = window;
    attachSettingsDiagnostics(window);
    window.once("ready-to-show", () => {
      window.show();
      window.focus();
    });
    window.on("close", () => {
      this.handlers.setShortcutCaptureActive(false);
    });
    window.on("closed", () => {
      this.window = undefined;
    });

    if (process.env.ELECTRON_RENDERER_URL) {
      void window.loadURL(new URL("settings.html", `${process.env.ELECTRON_RENDERER_URL}/`).toString());
    } else {
      void window.loadFile(join(__dirname, "../renderer/settings.html"));
    }
  }

  dispose(): void {
    ipcMain.removeHandler(SETTINGS_IPC_CHANNELS.getSettings);
    ipcMain.removeHandler(SETTINGS_IPC_CHANNELS.saveSettings);
    ipcMain.removeHandler(SETTINGS_IPC_CHANNELS.openPath);
    ipcMain.removeAllListeners(SETTINGS_IPC_CHANNELS.setShortcutCaptureState);
    this.handlers.setShortcutCaptureActive(false);
    this.window?.destroy();
    this.window = undefined;
  }
}

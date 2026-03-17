import type { BrowserWindow as BrowserWindowType } from "electron/main";
import { join } from "node:path";
import type { AppSettings } from "@latex-suite/contracts";
import {
  SETTINGS_IPC_CHANNELS,
  type DesktopSettingsSaveResult,
  type ShortcutCaptureStatePayload,
  type UpdateDesktopSettingsPayload
} from "../shared/settings-payload.js";
import { BrowserWindow, ipcMain } from "./electron-main.js";
import { log, logError } from "./logger.js";
import { resolvePreloadEntryPath } from "./popup-runtime-utils.js";

export interface SettingsWindowHandlers {
  getSettings: () => AppSettings;
  saveSettings: (payload: UpdateDesktopSettingsPayload) => DesktopSettingsSaveResult;
  setShortcutCaptureActive: (active: boolean) => void;
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
        defaultInteractionProfile: settings.defaultInteractionProfile
      };
    });
    ipcMain.handle(SETTINGS_IPC_CHANNELS.saveSettings, (_event, payload: UpdateDesktopSettingsPayload) =>
      this.handlers.saveSettings(payload)
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
    ipcMain.removeAllListeners(SETTINGS_IPC_CHANNELS.setShortcutCaptureState);
    this.handlers.setShortcutCaptureActive(false);
    this.window?.destroy();
    this.window = undefined;
  }
}

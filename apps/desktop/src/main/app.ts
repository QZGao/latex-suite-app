import { join } from "node:path";
import type { AppSettings, InteractionProfileId } from "@latex-suite/contracts";
import { BridgeClient } from "./bridge-client.js";
import type {
  DesktopSettingsSaveResult,
  UpdateDesktopSettingsPayload
} from "../shared/settings-payload.js";
import { app, globalShortcut } from "./electron-main.js";
import { getDesktopWinBridgeLaunchSpec } from "./runtime-paths.js";
import {
  getConfiguredAppName,
  getConfiguredAppUserModelId,
  getUserDataOverridePath,
  shouldSkipSingleInstanceLock
} from "./runtime-overrides.js";
import { SessionController } from "./session-controller.js";
import { SettingsStore } from "./settings-store.js";
import { SettingsWindowService } from "./settings-window-service.js";
import { ShortcutService } from "./shortcut-service.js";
import { initializeFileLogging, log, logError } from "./logger.js";
import { TrayService } from "./tray-service.js";

/**
 * Application shell wires together the major services. Keep construction here,
 * keep behavior in the services.
 */
export class DesktopApp {
  private readonly sessionController = new SessionController(
    new BridgeClient(
      getDesktopWinBridgeLaunchSpec({
        isPackaged: app.isPackaged,
        resourcesPath: process.resourcesPath
      })
    )
  );
  private readonly settingsStore = new SettingsStore();
  private readonly shortcutService = new ShortcutService(globalShortcut);
  private readonly settingsWindowService = new SettingsWindowService({
    getSettings: () => this.requireSettings(),
    saveSettings: (payload) => this.saveDesktopSettings(payload),
    setShortcutCaptureActive: (active) => {
      this.shortcutService.setCaptureActive(active);
    }
  });
  private readonly trayService = new TrayService();
  private settings?: AppSettings;

  async start(): Promise<void> {
    const userDataPath = getUserDataOverridePath();
    if (userDataPath) {
      app.setPath("userData", userDataPath);
    }

    app.setName(getConfiguredAppName());
    app.setAppUserModelId(getConfiguredAppUserModelId());

    if (!shouldSkipSingleInstanceLock()) {
      if (!app.requestSingleInstanceLock()) {
        app.quit();
        return;
      }

      app.on("second-instance", () => {
        this.sessionController.focusPopup();
      });
    }

    await app.whenReady();
    initializeFileLogging(join(app.getPath("userData"), "logs", "desktop.log"));
    this.settings = this.settingsStore.load();
    this.applyLaunchAtLoginSetting(this.settings.launchAtLogin);
    app.on("window-all-closed", (event) => {
      event.preventDefault();
    });

    const shortcutResult = this.shortcutService.register(this.settings.shortcut, () => {
      this.triggerCompose();
    });
    if (!shortcutResult.ok) {
      log("shortcut", "Shortcut registration failed during startup.", {
        shortcut: this.settings.shortcut,
        error: shortcutResult.error ?? null
      });
    }
    this.trayService.create(
      {
        onCompose: () => {
          this.triggerCompose();
        },
        onOpenSettings: () => {
          this.settingsWindowService.show();
        },
        onQuit: () => {
          app.quit();
        },
        onSelectInteractionProfile: (profileId) => {
          this.updateInteractionProfile(profileId);
        }
      },
      this.settings.defaultInteractionProfile
    );
    void this.sessionController.prewarm().catch((error) => {
      log("bridge", "Bridge prewarm failed; the first compose session will cold-start it.", {
        error: error instanceof Error ? error.message : String(error)
      });
    });

    app.on("will-quit", () => {
      this.shortcutService.dispose();
      this.settingsWindowService.dispose();
      this.trayService.dispose();
      void this.sessionController.dispose();
    });

    log("app", "Desktop shell started.", {
      shortcut: this.settings.shortcut,
      launchAtLogin: this.settings.launchAtLogin,
      defaultInteractionProfile: this.settings.defaultInteractionProfile
    });
  }

  private compose(): Promise<void> {
    return this.sessionController.startSession(this.requireSettings());
  }

  private triggerCompose(): void {
    void this.compose().catch((error) => {
      logError("session", "Compose failed before the popup could open.", error);
    });
  }

  private updateInteractionProfile(profileId: InteractionProfileId): void {
    const settings = this.requireSettings();
    if (settings.defaultInteractionProfile === profileId) {
      return;
    }

    this.settings = {
      ...settings,
      defaultInteractionProfile: profileId
    };
    this.settingsStore.save(this.settings);
    this.trayService.updateInteractionProfile(profileId);

    log("settings", "Updated default interaction profile.", {
      defaultInteractionProfile: profileId
    });
  }

  private saveDesktopSettings(
    payload: UpdateDesktopSettingsPayload
  ): DesktopSettingsSaveResult {
    const previousSettings = this.requireSettings();
    const shortcutResult =
      payload.shortcut === previousSettings.shortcut
        ? {
            ok: true,
            shortcut: previousSettings.shortcut
          }
        : this.shortcutService.update(payload.shortcut);

    if (!shortcutResult.ok) {
      return {
        ok: false,
        settings: {
          shortcut: previousSettings.shortcut,
          launchAtLogin: previousSettings.launchAtLogin,
          defaultInteractionProfile: previousSettings.defaultInteractionProfile
        },
        error: shortcutResult.error
      };
    }

    const nextSettings: AppSettings = {
      ...previousSettings,
      shortcut: shortcutResult.shortcut,
      launchAtLogin: payload.launchAtLogin,
      defaultInteractionProfile: payload.defaultInteractionProfile
    };

    try {
      if (nextSettings.launchAtLogin !== previousSettings.launchAtLogin) {
        this.applyLaunchAtLoginSetting(nextSettings.launchAtLogin);
      }

      this.settingsStore.save(nextSettings);
      this.settings = nextSettings;
      this.trayService.updateInteractionProfile(nextSettings.defaultInteractionProfile);
    } catch (error) {
      if (shortcutResult.shortcut !== previousSettings.shortcut) {
        this.shortcutService.update(previousSettings.shortcut);
      }
      if (nextSettings.launchAtLogin !== previousSettings.launchAtLogin) {
        this.applyLaunchAtLoginSetting(previousSettings.launchAtLogin);
      }
      this.settings = previousSettings;

      return {
        ok: false,
        settings: {
          shortcut: previousSettings.shortcut,
          launchAtLogin: previousSettings.launchAtLogin,
          defaultInteractionProfile: previousSettings.defaultInteractionProfile
        },
        error: error instanceof Error ? error.message : String(error)
      };
    }

    log("settings", "Updated desktop settings.", {
      shortcut: nextSettings.shortcut,
      launchAtLogin: nextSettings.launchAtLogin,
      defaultInteractionProfile: nextSettings.defaultInteractionProfile
    });

    return {
      ok: true,
      settings: {
        shortcut: nextSettings.shortcut,
        launchAtLogin: nextSettings.launchAtLogin,
        defaultInteractionProfile: nextSettings.defaultInteractionProfile
      }
    };
  }

  private applyLaunchAtLoginSetting(openAtLogin: boolean): void {
    if (!app.isPackaged) {
      log("settings", "Skipping login item change because the app is not packaged.", {
        openAtLogin
      });
      return;
    }

    app.setLoginItemSettings({
      openAtLogin
    });
  }

  private requireSettings(): AppSettings {
    if (!this.settings) {
      throw new Error("Desktop settings were requested before startup completed.");
    }

    return this.settings;
  }
}

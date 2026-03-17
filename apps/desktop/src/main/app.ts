import { app } from "electron";
import { BridgeClient } from "./bridge-client.js";
import { getDesktopWinBridgeLaunchSpec } from "./runtime-paths.js";
import { SessionController } from "./session-controller.js";
import { SettingsStore } from "./settings-store.js";
import { ShortcutService } from "./shortcut-service.js";
import { log } from "./logger.js";
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
  private readonly shortcutService = new ShortcutService();
  private readonly trayService = new TrayService();

  async start(): Promise<void> {
    if (!app.requestSingleInstanceLock()) {
      app.quit();
      return;
    }

    app.on("second-instance", () => {
      this.sessionController.focusPopup();
    });

    await app.whenReady();
    const settings = this.settingsStore.load();
    app.on("window-all-closed", (event) => {
      event.preventDefault();
    });

    this.shortcutService.register(settings.shortcut, () => {
      void this.sessionController.startSession(settings);
    });
    this.trayService.create(
      () => {
        void this.sessionController.startSession(settings);
      },
      () => {
        app.quit();
      }
    );

    app.on("will-quit", () => {
      this.shortcutService.dispose();
      this.trayService.dispose();
      void this.sessionController.dispose();
    });

    log("app", "Desktop shell started.", { shortcut: settings.shortcut });
  }
}

import { join } from "node:path";
import {
  type Tray as TrayType
} from "electron/main";
import type { InteractionProfileId } from "@latex-suite/contracts";
import { app, Menu, Tray, nativeImage } from "./electron-main.js";
import { buildTrayMenuTemplate, type TrayMenuHandlers } from "./tray-menu.js";

function createTrayIcon() {
  return nativeImage
    .createFromPath(join(app.getAppPath(), "assets", "icon.png"))
    .resize({ width: 16, height: 16 });
}

/**
 * Keeps the app discoverable while it lives in the background.
 */
export class TrayService {
  private tray?: TrayType;
  private handlers?: TrayMenuHandlers;
  private selectedInteractionProfileId: InteractionProfileId = "insert";

  create(
    handlers: TrayMenuHandlers,
    selectedInteractionProfileId: InteractionProfileId
  ): void {
    if (this.tray) {
      return;
    }
    this.handlers = handlers;
    this.selectedInteractionProfileId = selectedInteractionProfileId;

    this.tray = new Tray(createTrayIcon());
    this.tray.setToolTip("latex-suite-app");
    this.refreshContextMenu();
    this.tray.on("click", handlers.onCompose);
  }

  updateInteractionProfile(selectedInteractionProfileId: InteractionProfileId): void {
    this.selectedInteractionProfileId = selectedInteractionProfileId;
    this.refreshContextMenu();
  }

  dispose(): void {
    this.tray?.destroy();
    this.tray = undefined;
    this.handlers = undefined;
  }

  private refreshContextMenu(): void {
    if (!this.tray || !this.handlers) {
      return;
    }

    this.tray.setContextMenu(
      Menu.buildFromTemplate(
        buildTrayMenuTemplate(this.selectedInteractionProfileId, this.handlers)
      )
    );
  }
}

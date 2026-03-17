import {
  type Tray as TrayType
} from "electron/main";
import type { InteractionProfileId } from "@latex-suite/contracts";
import { Menu, Tray, nativeImage } from "./electron-main.js";
import { buildTrayMenuTemplate, type TrayMenuHandlers } from "./tray-menu.js";

function createTrayIcon() {
  return nativeImage
    .createFromDataURL(
      "data:image/svg+xml;utf8," +
        encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <rect x="3" y="3" width="26" height="26" rx="8" fill="#f5ecdf" stroke="#a9512e" stroke-width="2"/>
            <path d="M10 22 L16 10 L22 22" fill="none" stroke="#a9512e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12.5 17.5 H19.5" fill="none" stroke="#a9512e" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `)
    )
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

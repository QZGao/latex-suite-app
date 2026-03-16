import { Menu, Tray, nativeImage, type MenuItemConstructorOptions } from "electron";

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
  private tray?: Tray;

  create(onCompose: () => void, onQuit: () => void): void {
    if (this.tray) {
      return;
    }

    const menuTemplate: MenuItemConstructorOptions[] = [
      {
        label: "Compose",
        click: onCompose
      },
      {
        type: "separator"
      },
      {
        label: "Quit",
        click: onQuit
      }
    ];

    this.tray = new Tray(createTrayIcon());
    this.tray.setToolTip("latex-suite-app");
    this.tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));
    this.tray.on("click", onCompose);
  }

  dispose(): void {
    this.tray?.destroy();
    this.tray = undefined;
  }
}

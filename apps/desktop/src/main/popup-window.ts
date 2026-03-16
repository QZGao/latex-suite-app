import { BrowserWindow, screen } from "electron";
import { join } from "node:path";
import type { AppSettings, HostBounds } from "@latex-suite/contracts";
import { computePopupBounds } from "./popup-placement.js";

/**
 * Creates the frameless composer popup window.
 */
export function createPopupWindow(
  popupSettings: AppSettings["popup"]
): BrowserWindow {
  const window = new BrowserWindow({
    width: popupSettings.width,
    height: Math.max(popupSettings.minHeight + 140, 320),
    minWidth: 420,
    minHeight: popupSettings.minHeight,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    alwaysOnTop: true,
    resizable: false,
    fullscreenable: false,
    backgroundColor: "#fffaf2",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return window;
}

export function positionPopupWindow(
  window: BrowserWindow,
  popupSettings: AppSettings["popup"],
  sourceBounds: HostBounds
): void {
  const display = screen.getDisplayMatching({
    x: sourceBounds.x,
    y: sourceBounds.y,
    width: sourceBounds.width,
    height: sourceBounds.height
  });
  const bounds = computePopupBounds(popupSettings, sourceBounds, display.workArea);
  window.setBounds(bounds);
}

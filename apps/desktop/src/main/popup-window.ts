import { BrowserWindow, screen } from "electron";
import { join } from "node:path";
import type { AppSettings, HostBounds } from "@latex-suite/contracts";
import { computePopupBounds } from "./popup-placement.js";
import { log, logError } from "./logger.js";
import { resolvePreloadEntryPath } from "./popup-runtime-utils.js";

function attachPopupDiagnostics(window: BrowserWindow): void {
  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl) => {
    logError("popup", "Popup renderer failed to load.", {
      errorCode,
      errorDescription,
      validatedUrl
    });
  });

  window.webContents.on("preload-error", (_event, preloadPath, error) => {
    logError("popup", "Popup preload failed to load.", {
      preloadPath,
      error: error.message
    });
  });

  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    log("popup:renderer", message, {
      level,
      line,
      sourceId
    });
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    logError("popup", "Popup render process exited unexpectedly.", details);
  });
}

/**
 * Creates the frameless composer popup window.
 */
export function createPopupWindow(
  popupSettings: AppSettings["popup"]
): BrowserWindow {
  const preloadPath = resolvePreloadEntryPath(__dirname);
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
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  attachPopupDiagnostics(window);

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

import { globalShortcut } from "./electron-main.js";
import { log } from "./logger.js";

/**
 * Centralizes shortcut registration so the rest of the app does not talk to
 * Electron's global shortcut API directly.
 */
export class ShortcutService {
  register(shortcut: string, handler: () => void): void {
    globalShortcut.unregisterAll();
    const ok = globalShortcut.register(shortcut, handler);
    log("shortcut", ok ? "Registered shortcut." : "Failed to register shortcut.", {
      shortcut
    });
  }

  dispose(): void {
    globalShortcut.unregisterAll();
  }
}

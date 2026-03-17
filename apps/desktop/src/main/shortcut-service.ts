import { normalizeShortcutAccelerator } from "../shared/shortcut-accelerator.js";
import { log } from "./logger.js";

export interface ShortcutRegistrationResult {
  ok: boolean;
  shortcut: string;
  error?: string;
}

interface GlobalShortcutAdapter {
  register(accelerator: string, callback: () => void): boolean;
  unregisterAll(): void;
}

/**
 * Centralizes shortcut registration so the rest of the app does not talk to
 * Electron's global shortcut API directly.
 */
export class ShortcutService {
  private currentShortcut = "";
  private captureActive = false;
  private handler?: () => void;
  private readonly registeredHandler = (): void => {
    if (this.captureActive) {
      log("shortcut", "Ignored shortcut invocation while shortcut capture is active.", {
        shortcut: this.currentShortcut || null
      });
      return;
    }

    this.handler?.();
  };

  constructor(private readonly shortcutAdapter: GlobalShortcutAdapter) {}

  register(shortcut: string, handler: () => void): ShortcutRegistrationResult {
    this.handler = handler;
    return this.setShortcut(shortcut, "");
  }

  update(shortcut: string): ShortcutRegistrationResult {
    if (!this.handler) {
      throw new Error("Cannot update the global shortcut before initial registration.");
    }

    return this.setShortcut(shortcut, this.currentShortcut);
  }

  setCaptureActive(active: boolean): ShortcutRegistrationResult {
    if (active === this.captureActive) {
      return {
        ok: true,
        shortcut: this.currentShortcut
      };
    }

    this.captureActive = active;

    if (active) {
      this.shortcutAdapter.unregisterAll();
      log("shortcut", "Suspended global shortcut registration for shortcut capture.", {
        shortcut: this.currentShortcut || null
      });
      return {
        ok: true,
        shortcut: this.currentShortcut
      };
    }

    const result = this.registerCurrentShortcut();
    log(
      "shortcut",
      result.ok ? "Restored global shortcut after shortcut capture." : "Failed to restore global shortcut after shortcut capture.",
      {
        shortcut: result.shortcut || null,
        error: result.error ?? null
      }
    );
    return result;
  }

  private setShortcut(shortcut: string, previousShortcut: string): ShortcutRegistrationResult {
    let normalizedShortcut = "";
    try {
      normalizedShortcut = normalizeShortcutAccelerator(shortcut);
    } catch (error) {
      return {
        ok: false,
        shortcut: previousShortcut,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    this.currentShortcut = normalizedShortcut;

    if (normalizedShortcut === previousShortcut) {
      return {
        ok: true,
        shortcut: normalizedShortcut
      };
    }

    if (this.captureActive) {
      log("shortcut", "Updated shortcut while shortcut capture is active; registration deferred.", {
        shortcut: normalizedShortcut
      });
      return {
        ok: true,
        shortcut: normalizedShortcut
      };
    }

    this.shortcutAdapter.unregisterAll();
    const ok = this.tryRegister(normalizedShortcut);

    if (ok) {
      log("shortcut", "Registered shortcut.", {
        shortcut: normalizedShortcut
      });
      return {
        ok: true,
        shortcut: normalizedShortcut
      };
    }

    if (previousShortcut) {
      this.tryRegister(previousShortcut);
      this.currentShortcut = previousShortcut;
    } else {
      this.currentShortcut = "";
    }

    log("shortcut", "Failed to register shortcut.", {
      shortcut: normalizedShortcut,
      restoredShortcut: previousShortcut || null
    });

    return {
      ok: false,
      shortcut: previousShortcut,
      error: `Electron could not register "${normalizedShortcut}". It may be invalid or already in use.`
    };
  }

  private registerCurrentShortcut(): ShortcutRegistrationResult {
    if (!this.currentShortcut) {
      return {
        ok: true,
        shortcut: ""
      };
    }

    this.shortcutAdapter.unregisterAll();
    if (this.tryRegister(this.currentShortcut)) {
      return {
        ok: true,
        shortcut: this.currentShortcut
      };
    }

    return {
      ok: false,
      shortcut: this.currentShortcut,
      error: `Electron could not register "${this.currentShortcut}". It may be invalid or already in use.`
    };
  }

  private tryRegister(shortcut: string): boolean {
    if (!this.handler) {
      return false;
    }

    try {
      return this.shortcutAdapter.register(shortcut, this.registeredHandler);
    } catch {
      return false;
    }
  }

  dispose(): void {
    this.shortcutAdapter.unregisterAll();
    this.currentShortcut = "";
    this.captureActive = false;
    this.handler = undefined;
  }
}

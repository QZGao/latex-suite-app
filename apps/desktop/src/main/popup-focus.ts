export interface PopupFocusWindow {
  show(): void;
  focus(): void;
  minimize(): void;
  moveTop(): void;
  isDestroyed(): boolean;
  isFocused?(): boolean;
  isMinimized(): boolean;
  isVisible(): boolean;
  setAlwaysOnTop(flag: boolean): void;
  webContents: {
    focus(): void;
  };
}

export type PopupFocusScheduler = (callback: () => void, delayMs: number) => void;

export interface PopupFocusLogger {
  (message: string, payload?: Record<string, unknown>): void;
}

export interface PopupAppFocusTarget {
  focus(): void;
}

const NOOP_APP_FOCUS_TARGET: PopupAppFocusTarget = {
  focus() {}
};

const POPUP_FOCUS_RETRY_DELAYS_MS = [0, 30, 90, 180, 320, 500] as const;

function defaultScheduler(callback: () => void, delayMs: number): void {
  setTimeout(callback, delayMs);
}

function applyPopupFocus(
  window: PopupFocusWindow,
  appFocusTarget: PopupAppFocusTarget
): void {
  if (!window.isFocused?.() && !window.isMinimized()) {
    window.minimize();
  }

  window.show();
  window.setAlwaysOnTop(true);
  appFocusTarget.focus();
  window.setAlwaysOnTop(false);
  window.focus();
  window.moveTop();
  window.webContents.focus();
}

function hasPopupFocus(window: PopupFocusWindow): boolean {
  return window.isFocused?.() ?? false;
}

/**
 * Shows the popup and keeps reapplying focus for a short burst. Frameless
 * always-on-top windows can briefly lose the foreground race back to the host,
 * so one retry is not reliably enough in real editors.
 */
export function showPopupWindowWithScheduler(
  window: PopupFocusWindow,
  schedule: PopupFocusScheduler = defaultScheduler,
  log?: PopupFocusLogger,
  appFocusTarget: PopupAppFocusTarget = NOOP_APP_FOCUS_TARGET
): void {
  if (window.isVisible() && hasPopupFocus(window)) {
    log?.("Popup focus request skipped because the popup is already focused.", {
      visible: window.isVisible(),
      destroyed: window.isDestroyed()
    });
    return;
  }

  applyPopupFocus(window, appFocusTarget);
  log?.("Popup show/focus applied.", {
    visible: window.isVisible(),
    destroyed: window.isDestroyed()
  });

  for (const delayMs of POPUP_FOCUS_RETRY_DELAYS_MS) {
    schedule(() => {
      if (window.isDestroyed() || !window.isVisible()) {
        log?.("Popup focus retry skipped.", {
          visible: window.isVisible(),
          destroyed: window.isDestroyed(),
          delayMs
        });
        return;
      }

      if (hasPopupFocus(window)) {
        log?.("Popup focus retry skipped because the popup is already focused.", {
          visible: window.isVisible(),
          destroyed: window.isDestroyed(),
          delayMs
        });
        return;
      }

      applyPopupFocus(window, appFocusTarget);
      log?.("Popup focus reapplied.", {
        visible: window.isVisible(),
        destroyed: window.isDestroyed(),
        delayMs
      });
    }, delayMs);
  }
}

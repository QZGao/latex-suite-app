import {
  COMPOSER_IPC_CHANNELS,
  type ComposerBootstrapPayload
} from "../shared/composer-payload.js";

export interface PopupBootstrapWindow {
  isDestroyed(): boolean;
  webContents: {
    isLoadingMainFrame(): boolean;
    getURL(): string;
    send(channel: string, payload: ComposerBootstrapPayload): void;
  };
}

export type PopupBootstrapScheduler = (callback: () => void, delayMs: number) => void;

export interface PopupBootstrapLogger {
  (message: string, payload?: Record<string, unknown>): void;
}

const POPUP_BOOTSTRAP_RETRY_DELAYS_MS = [0, 30, 90, 180, 320, 500] as const;

function defaultScheduler(callback: () => void, delayMs: number): void {
  setTimeout(callback, delayMs);
}

function canPushBootstrap(window: PopupBootstrapWindow): boolean {
  return !window.isDestroyed() &&
    !window.webContents.isLoadingMainFrame() &&
    window.webContents.getURL().length > 0;
}

function pushBootstrap(
  window: PopupBootstrapWindow,
  payload: ComposerBootstrapPayload
): boolean {
  if (!canPushBootstrap(window)) {
    return false;
  }

  window.webContents.send(COMPOSER_IPC_CHANNELS.pushBootstrap, payload);
  return true;
}

export interface SchedulePopupBootstrapDeliveryOptions {
  window: PopupBootstrapWindow;
  payload: ComposerBootstrapPayload;
  isMounted: () => boolean;
  schedule?: PopupBootstrapScheduler;
  logger?: PopupBootstrapLogger;
}

/**
 * Re-sends the active session bootstrap for a short burst so prewarmed popup
 * renderers cannot miss the handoff when the composer is shown.
 */
export function schedulePopupBootstrapDelivery(
  options: SchedulePopupBootstrapDeliveryOptions
): void {
  const schedule = options.schedule ?? defaultScheduler;

  const attemptPush = (delayMs: number | null): void => {
    if (options.isMounted()) {
      options.logger?.("Popup bootstrap retry skipped because the renderer is already mounted.", {
        delayMs
      });
      return;
    }

    const pushed = pushBootstrap(options.window, options.payload);
    options.logger?.(
      pushed
        ? "Popup bootstrap pushed."
        : "Popup bootstrap retry deferred because the renderer is not ready.",
      {
        delayMs
      }
    );
  };

  attemptPush(null);

  for (const delayMs of POPUP_BOOTSTRAP_RETRY_DELAYS_MS) {
    schedule(() => {
      attemptPush(delayMs);
    }, delayMs);
  }
}

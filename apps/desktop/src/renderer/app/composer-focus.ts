export interface ComposerFocusEditor {
  focus(): void;
}

export interface ComposerFocusWindowTarget {
  addEventListener(type: "blur" | "focus", listener: () => void): void;
  removeEventListener(type: "blur" | "focus", listener: () => void): void;
  focus?(): void;
}

export type ComposerFrameScheduler = (callback: () => void) => void;
export type ComposerTimeoutScheduler = (callback: () => void, delayMs: number) => number;
export type ComposerTimeoutCanceler = (timeoutId: number) => void;

export interface ComposerFocusLogger {
  (message: string, payload?: Record<string, unknown>): void;
}

export interface BindComposerFocusHandlersOptions {
  editor: ComposerFocusEditor;
  closeOnBlur: boolean;
  commit: () => void;
  windowTarget?: ComposerFocusWindowTarget;
  scheduleFrame?: ComposerFrameScheduler;
  scheduleTimeout?: ComposerTimeoutScheduler;
  clearScheduledTimeout?: ComposerTimeoutCanceler;
  logger?: ComposerFocusLogger;
}

const COMPOSER_FOCUS_RETRY_DELAYS_MS = [30, 90, 180, 320] as const;

function defaultFrameScheduler(callback: () => void): void {
  requestAnimationFrame(callback);
}

function defaultTimeoutScheduler(callback: () => void, delayMs: number): number {
  return window.setTimeout(callback, delayMs);
}

function defaultTimeoutCanceler(timeoutId: number): void {
  window.clearTimeout(timeoutId);
}

function defaultWindowTarget(): ComposerFocusWindowTarget {
  return window;
}

function requestComposerFocus(
  editor: ComposerFocusEditor,
  windowTarget: ComposerFocusWindowTarget
): void {
  windowTarget.focus?.();
  editor.focus();
}

/**
 * Owns the small focus/blur contract around the popup editor. Keeping it in a
 * dedicated helper makes the behavior testable without the whole renderer app.
 */
export function bindComposerFocusHandlers(
  options: BindComposerFocusHandlersOptions
): () => void {
  const windowTarget = options.windowTarget ?? defaultWindowTarget();
  const scheduleFrame = options.scheduleFrame ?? defaultFrameScheduler;
  const scheduleTimeout = options.scheduleTimeout ?? defaultTimeoutScheduler;
  const clearScheduledTimeout = options.clearScheduledTimeout ?? defaultTimeoutCanceler;
  const scheduledTimeoutIds: number[] = [];
  let hasWindowFocus = false;

  const clearPendingRetries = (): void => {
    while (scheduledTimeoutIds.length > 0) {
      const timeoutId = scheduledTimeoutIds.pop();
      if (timeoutId !== undefined) {
        clearScheduledTimeout(timeoutId);
      }
    }
  };

  const blurHandler = (): void => {
    hasWindowFocus = false;
    options.logger?.("Composer window blur observed.", {
      closeOnBlur: options.closeOnBlur
    });
    if (options.closeOnBlur) {
      options.commit();
    }
  };

  const focusHandler = (): void => {
    hasWindowFocus = true;
    clearPendingRetries();
    options.logger?.("Composer window focus observed.");
    options.editor.focus();
  };

  windowTarget.addEventListener("blur", blurHandler);
  windowTarget.addEventListener("focus", focusHandler);

  options.logger?.("Composer focus requested immediately.");
  requestComposerFocus(options.editor, windowTarget);

  scheduleFrame(() => {
    if (hasWindowFocus) {
      options.logger?.("Composer focus retry skipped because the window is already focused.", {
        phase: "animation-frame"
      });
      return;
    }

    options.logger?.("Composer focus requested on animation frame.");
    requestComposerFocus(options.editor, windowTarget);
  });

  for (const delayMs of COMPOSER_FOCUS_RETRY_DELAYS_MS) {
    const timeoutId = scheduleTimeout(() => {
      if (hasWindowFocus) {
        options.logger?.("Composer focus retry skipped because the window is already focused.", {
          delayMs
        });
        return;
      }

      options.logger?.("Composer focus requested on timeout.", {
        delayMs
      });
      requestComposerFocus(options.editor, windowTarget);
    }, delayMs);
    scheduledTimeoutIds.push(timeoutId);
  }

  return () => {
    clearPendingRetries();
    windowTarget.removeEventListener("blur", blurHandler);
    windowTarget.removeEventListener("focus", focusHandler);
  };
}

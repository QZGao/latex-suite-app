import { describe, expect, it, vi } from "vitest";
import { showPopupWindowWithScheduler, type PopupFocusWindow } from "./popup-focus.js";

function createWindowState(overrides: Partial<PopupFocusWindow> = {}): PopupFocusWindow & {
  calls: string[];
  focused: boolean;
} {
  const calls: string[] = [];
  let visible = false;
  let focused = false;

  return {
    calls,
    focused,
    show() {
      calls.push("show");
      visible = true;
    },
    focus() {
      calls.push("focus");
      focused = true;
    },
    minimize() {
      calls.push("minimize");
      visible = false;
    },
    moveTop() {
      calls.push("moveTop");
    },
    isDestroyed() {
      return false;
    },
    isFocused() {
      return focused;
    },
    isMinimized() {
      return false;
    },
    isVisible() {
      return visible;
    },
    setAlwaysOnTop(flag) {
      calls.push(`setAlwaysOnTop:${String(flag)}`);
    },
    webContents: {
      focus() {
        calls.push("webContents.focus");
      }
    },
    ...overrides
  };
}

describe("showPopupWindowWithScheduler", () => {
  function createAppFocusTarget() {
    return {
      focus: vi.fn()
    };
  }

  it("shows the popup and applies focus immediately and on retry", () => {
    const scheduledCallbacks: Array<() => void> = [];
    const windowState = createWindowState();
    const appFocusTarget = createAppFocusTarget();

    showPopupWindowWithScheduler(
      windowState,
      (callback) => {
        scheduledCallbacks.push(callback);
      },
      undefined,
      appFocusTarget
    );

    expect(windowState.calls).toEqual([
      "minimize",
      "show",
      "setAlwaysOnTop:true",
      "setAlwaysOnTop:false",
      "focus",
      "moveTop",
      "webContents.focus"
    ]);
    expect(appFocusTarget.focus).toHaveBeenCalledTimes(1);

    for (const callback of scheduledCallbacks) {
      callback();
    }
    expect(windowState.calls).toEqual([
      "minimize",
      "show",
      "setAlwaysOnTop:true",
      "setAlwaysOnTop:false",
      "focus",
      "moveTop",
      "webContents.focus"
    ]);
  });

  it("reapplies focus without calling show again when the popup is already visible", () => {
    const scheduledCallbacks: Array<() => void> = [];
    const windowState = createWindowState();
    const appFocusTarget = createAppFocusTarget();

    windowState.show();
    windowState.calls.length = 0;

    showPopupWindowWithScheduler(
      windowState,
      (callback) => {
        scheduledCallbacks.push(callback);
      },
      undefined,
      appFocusTarget
    );

    for (const callback of scheduledCallbacks) {
      callback();
    }

    expect(windowState.calls).toEqual([
      "minimize",
      "show",
      "setAlwaysOnTop:true",
      "setAlwaysOnTop:false",
      "focus",
      "moveTop",
      "webContents.focus"
    ]);
    expect(appFocusTarget.focus).toHaveBeenCalledTimes(1);
  });

  it("skips the retry focus pass when the popup is no longer visible", () => {
    const scheduledCallbacks: Array<() => void> = [];
    const windowState = createWindowState({
      isVisible() {
        return false;
      }
    });
    const appFocusTarget = createAppFocusTarget();

    showPopupWindowWithScheduler(
      windowState,
      (callback) => {
        scheduledCallbacks.push(callback);
      },
      undefined,
      appFocusTarget
    );

    for (const callback of scheduledCallbacks) {
      callback();
    }
    expect(windowState.calls).toEqual([
      "minimize",
      "show",
      "setAlwaysOnTop:true",
      "setAlwaysOnTop:false",
      "focus",
      "moveTop",
      "webContents.focus"
    ]);
  });

  it("emits focus diagnostics for immediate and retried focus", () => {
    const scheduledCallbacks: Array<() => void> = [];
    const windowState = createWindowState();
    const logger = vi.fn();
    const appFocusTarget = createAppFocusTarget();

    showPopupWindowWithScheduler(
      windowState,
      (callback) => {
        scheduledCallbacks.push(callback);
      },
      logger,
      appFocusTarget
    );

    for (const callback of scheduledCallbacks) {
      callback();
    }

    expect(logger).toHaveBeenCalledTimes(7);
    expect(logger).toHaveBeenNthCalledWith(
      1,
      "Popup show/focus applied.",
      expect.objectContaining({
        visible: true,
        destroyed: false
      })
    );
    expect(logger).toHaveBeenNthCalledWith(
      2,
      "Popup focus retry skipped because the popup is already focused.",
      expect.objectContaining({
        visible: true,
        destroyed: false,
        delayMs: 0
      })
    );
    expect(logger).toHaveBeenNthCalledWith(
      3,
      "Popup focus retry skipped because the popup is already focused.",
      expect.objectContaining({
        visible: true,
        destroyed: false,
        delayMs: 30
      })
    );
    expect(logger).toHaveBeenNthCalledWith(
      4,
      "Popup focus retry skipped because the popup is already focused.",
      expect.objectContaining({
        visible: true,
        destroyed: false,
        delayMs: 90
      })
    );
    expect(logger).toHaveBeenNthCalledWith(
      7,
      "Popup focus retry skipped because the popup is already focused.",
      expect.objectContaining({
        visible: true,
        destroyed: false,
        delayMs: 500
      })
    );
  });

  it("schedules the full focus retry burst", () => {
    const scheduledDelays: number[] = [];

    showPopupWindowWithScheduler(
      createWindowState(),
      (_callback, delayMs) => {
        scheduledDelays.push(delayMs);
      },
      undefined,
      createAppFocusTarget()
    );

    expect(scheduledDelays).toEqual([0, 30, 90, 180, 320, 500]);
  });

  it("does nothing when the popup is already visible and focused", () => {
    const logger = vi.fn();
    const windowState = createWindowState();
    const appFocusTarget = createAppFocusTarget();

    windowState.show();
    windowState.focus();
    windowState.calls.length = 0;

    showPopupWindowWithScheduler(windowState, vi.fn(), logger, appFocusTarget);

    expect(windowState.calls).toEqual([]);
    expect(appFocusTarget.focus).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith(
      "Popup focus request skipped because the popup is already focused.",
      expect.objectContaining({
        visible: true,
        destroyed: false
      })
    );
  });

  it("does not minimize an already minimized window before forcing the focus sequence", () => {
    const scheduledCallbacks: Array<() => void> = [];
    const appFocusTarget = createAppFocusTarget();
    const windowState = createWindowState({
      isMinimized() {
        return true;
      }
    });

    showPopupWindowWithScheduler(
      windowState,
      (callback) => {
        scheduledCallbacks.push(callback);
      },
      undefined,
      appFocusTarget
    );

    expect(windowState.calls).toEqual([
      "show",
      "setAlwaysOnTop:true",
      "setAlwaysOnTop:false",
      "focus",
      "moveTop",
      "webContents.focus"
    ]);
    expect(appFocusTarget.focus).toHaveBeenCalledTimes(1);
  });
});

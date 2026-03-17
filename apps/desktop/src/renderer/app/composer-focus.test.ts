import { describe, expect, it, vi } from "vitest";
import { bindComposerFocusHandlers, type ComposerFocusWindowTarget } from "./composer-focus.js";

function createWindowTarget(): ComposerFocusWindowTarget & {
  emit(type: "blur" | "focus"): void;
} {
  const listeners = new Map<"blur" | "focus", Set<() => void>>([
    ["blur", new Set()],
    ["focus", new Set()]
  ]);

  return {
    addEventListener(type, listener) {
      listeners.get(type)?.add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    emit(type) {
      for (const listener of listeners.get(type) ?? []) {
        listener();
      }
    }
  };
}

describe("bindComposerFocusHandlers", () => {
  it("focuses the window/editor immediately and across the retry burst", () => {
    const editor = {
      focus: vi.fn()
    };
    const windowTarget = createWindowTarget();
    let scheduledCallback: (() => void) | undefined;
    const timeoutCallbacks: Array<() => void> = [];

    bindComposerFocusHandlers({
      editor,
      closeOnBlur: true,
      commit: vi.fn(),
      windowTarget,
      scheduleFrame(callback) {
        scheduledCallback = callback;
      },
      scheduleTimeout(callback) {
        timeoutCallbacks.push(callback);
        return timeoutCallbacks.length;
      },
      clearScheduledTimeout: vi.fn()
    });

    expect(editor.focus).toHaveBeenCalledTimes(1);
    scheduledCallback?.();
    for (const callback of timeoutCallbacks) {
      callback();
    }
    expect(editor.focus).toHaveBeenCalledTimes(6);
  });

  it("stops retrying after the window reports focus", () => {
    const editor = {
      focus: vi.fn()
    };
    const clearScheduledTimeout = vi.fn();
    const windowTarget = createWindowTarget();
    const timeoutCallbacks: Array<() => void> = [];

    bindComposerFocusHandlers({
      editor,
      closeOnBlur: true,
      commit: vi.fn(),
      windowTarget,
      scheduleFrame: vi.fn(),
      scheduleTimeout(callback) {
        timeoutCallbacks.push(callback);
        return timeoutCallbacks.length;
      },
      clearScheduledTimeout
    });

    windowTarget.emit("focus");
    timeoutCallbacks[0]?.();
    timeoutCallbacks[1]?.();

    expect(editor.focus).toHaveBeenCalledTimes(2);
    expect(clearScheduledTimeout).toHaveBeenCalledTimes(4);
  });

  it("focuses the window target when available", () => {
    const editor = {
      focus: vi.fn()
    };
    const windowTarget = {
      ...createWindowTarget(),
      focus: vi.fn()
    };

    bindComposerFocusHandlers({
      editor,
      closeOnBlur: true,
      commit: vi.fn(),
      windowTarget,
      scheduleFrame: vi.fn(),
      scheduleTimeout: vi.fn(() => 1),
      clearScheduledTimeout: vi.fn()
    });

    expect(windowTarget.focus).toHaveBeenCalledTimes(1);
  });

  it("refocuses the editor on window focus and commits on blur when enabled", () => {
    const editor = {
      focus: vi.fn()
    };
    const commit = vi.fn();
    const windowTarget = createWindowTarget();

    bindComposerFocusHandlers({
      editor,
      closeOnBlur: true,
      commit,
      windowTarget,
      scheduleFrame: vi.fn(),
      scheduleTimeout: vi.fn(() => 1),
      clearScheduledTimeout: vi.fn()
    });

    windowTarget.emit("focus");
    windowTarget.emit("blur");

    expect(editor.focus).toHaveBeenCalledTimes(2);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("does not commit on blur when close-on-blur is disabled", () => {
    const commit = vi.fn();
    const windowTarget = createWindowTarget();

    bindComposerFocusHandlers({
      editor: {
        focus: vi.fn()
      },
      closeOnBlur: false,
      commit,
      windowTarget,
      scheduleFrame: vi.fn(),
      scheduleTimeout: vi.fn(() => 1),
      clearScheduledTimeout: vi.fn()
    });

    windowTarget.emit("blur");
    expect(commit).not.toHaveBeenCalled();
  });

  it("removes the event listeners and pending retries during cleanup", () => {
    const editor = {
      focus: vi.fn()
    };
    const commit = vi.fn();
    const windowTarget = createWindowTarget();
    const clearScheduledTimeout = vi.fn();
    let timeoutId = 0;

    const dispose = bindComposerFocusHandlers({
      editor,
      closeOnBlur: true,
      commit,
      windowTarget,
      scheduleFrame: vi.fn(),
      scheduleTimeout: vi.fn(() => {
        timeoutId += 1;
        return timeoutId;
      }),
      clearScheduledTimeout
    });

    dispose();
    windowTarget.emit("focus");
    windowTarget.emit("blur");

    expect(editor.focus).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
    expect(clearScheduledTimeout).toHaveBeenCalledTimes(4);
    expect(clearScheduledTimeout.mock.calls.map(([timeoutId]) => timeoutId)).toEqual([4, 3, 2, 1]);
  });

  it("emits focus diagnostics for immediate, scheduled, timeout, focus, and blur paths", () => {
    const logger = vi.fn();
    const windowTarget = createWindowTarget();
    let scheduledCallback: (() => void) | undefined;
    const scheduledTimeoutCallbacks: Array<() => void> = [];

    bindComposerFocusHandlers({
      editor: {
        focus: vi.fn()
      },
      closeOnBlur: true,
      commit: vi.fn(),
      windowTarget,
      scheduleFrame(callback) {
        scheduledCallback = callback;
      },
      scheduleTimeout(callback) {
        scheduledTimeoutCallbacks.push(callback);
        return scheduledTimeoutCallbacks.length;
      },
      clearScheduledTimeout: vi.fn(),
      logger
    });

    scheduledCallback?.();
    scheduledTimeoutCallbacks[0]?.();
    windowTarget.emit("focus");
    scheduledTimeoutCallbacks[1]?.();
    windowTarget.emit("blur");

    expect(logger).toHaveBeenCalledWith("Composer focus requested immediately.");
    expect(logger).toHaveBeenCalledWith("Composer focus requested on animation frame.");
    expect(logger).toHaveBeenCalledWith(
      "Composer focus requested on timeout.",
      expect.objectContaining({
        delayMs: 30
      })
    );
    expect(logger).toHaveBeenCalledWith("Composer window focus observed.");
    expect(logger).toHaveBeenCalledWith(
      "Composer focus retry skipped because the window is already focused.",
      expect.objectContaining({
        delayMs: 90
      })
    );
    expect(logger).toHaveBeenCalledWith(
      "Composer window blur observed.",
      expect.objectContaining({
        closeOnBlur: true
      })
    );
  });
});

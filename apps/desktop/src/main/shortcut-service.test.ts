import { describe, expect, it, vi } from "vitest";
import { ShortcutService } from "./shortcut-service.js";

function createShortcutAdapter() {
  return {
    register: vi.fn(() => true),
    unregisterAll: vi.fn()
  };
}

describe("ShortcutService", () => {
  it("unregisters the global shortcut while shortcut capture is active", () => {
    const shortcutAdapter = createShortcutAdapter();
    const service = new ShortcutService(shortcutAdapter);

    service.register("Alt+X", vi.fn());
    shortcutAdapter.register.mockClear();
    shortcutAdapter.unregisterAll.mockClear();

    const result = service.setCaptureActive(true);

    expect(result.ok).toBe(true);
    expect(shortcutAdapter.unregisterAll).toHaveBeenCalledTimes(1);
    expect(shortcutAdapter.register).not.toHaveBeenCalled();
  });

  it("restores the registered shortcut when shortcut capture ends", () => {
    const shortcutAdapter = createShortcutAdapter();
    const service = new ShortcutService(shortcutAdapter);

    service.register("Alt+X", vi.fn());
    service.setCaptureActive(true);
    shortcutAdapter.register.mockClear();
    shortcutAdapter.unregisterAll.mockClear();

    const result = service.setCaptureActive(false);

    expect(result).toEqual({
      ok: true,
      shortcut: "Alt+X"
    });
    expect(shortcutAdapter.unregisterAll).toHaveBeenCalledTimes(1);
    expect(shortcutAdapter.register).toHaveBeenCalledWith("Alt+X", expect.any(Function));
  });

  it("ignores shortcut callbacks that arrive while capture is active", () => {
    const shortcutAdapter = createShortcutAdapter();
    const handler = vi.fn();
    const service = new ShortcutService(shortcutAdapter);

    service.register("Alt+X", handler);
    const registeredCallback = shortcutAdapter.register.mock.calls[0]?.[1];

    service.setCaptureActive(true);
    registeredCallback?.();

    expect(handler).not.toHaveBeenCalled();
  });

  it("defers shortcut updates until capture ends", () => {
    const shortcutAdapter = createShortcutAdapter();
    const service = new ShortcutService(shortcutAdapter);

    service.register("Alt+X", vi.fn());
    service.setCaptureActive(true);
    shortcutAdapter.register.mockClear();
    shortcutAdapter.unregisterAll.mockClear();

    const updateResult = service.update("Control+Shift+L");
    const resumeResult = service.setCaptureActive(false);

    expect(updateResult).toEqual({
      ok: true,
      shortcut: "Control+Shift+L"
    });
    expect(shortcutAdapter.register).toHaveBeenCalledTimes(1);
    expect(shortcutAdapter.register).toHaveBeenCalledWith(
      "Control+Shift+L",
      expect.any(Function)
    );
    expect(resumeResult).toEqual({
      ok: true,
      shortcut: "Control+Shift+L"
    });
  });
});

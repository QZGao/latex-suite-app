import { describe, expect, it } from "vitest";
import {
  buildShortcutAcceleratorFromKeyEvent,
  normalizeShortcutAccelerator
} from "./shortcut-accelerator.js";

describe("normalizeShortcutAccelerator", () => {
  it("normalizes whitespace and modifier casing", () => {
    expect(normalizeShortcutAccelerator(" alt + x ")).toBe("Alt+X");
  });

  it("keeps standard modifier ordering", () => {
    expect(normalizeShortcutAccelerator("shift+control+l")).toBe("Control+Shift+L");
  });

  it("supports punctuation keys used by the default shortcut", () => {
    expect(normalizeShortcutAccelerator("ctrl + .")).toBe("Control+.");
  });

  it("supports named keys", () => {
    expect(normalizeShortcutAccelerator("cmdorctrl+space")).toBe("CommandOrControl+Space");
  });

  it("rejects modifier-only accelerators", () => {
    expect(() => normalizeShortcutAccelerator("Alt+Shift")).toThrow(
      /non-modifier key/
    );
  });

  it("rejects shortcuts without modifiers", () => {
    expect(() => normalizeShortcutAccelerator("X")).toThrow(/modifier key/);
  });
});

describe("buildShortcutAcceleratorFromKeyEvent", () => {
  it("captures a basic modifier shortcut", () => {
    expect(
      buildShortcutAcceleratorFromKeyEvent({
        altKey: true,
        ctrlKey: false,
        key: "x",
        code: "KeyX",
        metaKey: false,
        shiftKey: false
      })
    ).toBe("Alt+X");
  });

  it("captures the period key for the default shortcut", () => {
    expect(
      buildShortcutAcceleratorFromKeyEvent({
        altKey: false,
        ctrlKey: true,
        key: ".",
        code: "Period",
        metaKey: false,
        shiftKey: false
      })
    ).toBe("Control+.");
  });

  it("uses code for shifted digit keys", () => {
    expect(
      buildShortcutAcceleratorFromKeyEvent({
        altKey: false,
        ctrlKey: true,
        key: "!",
        code: "Digit1",
        metaKey: false,
        shiftKey: true
      })
    ).toBe("Control+Shift+1");
  });

  it("ignores modifier-only key presses", () => {
    expect(
      buildShortcutAcceleratorFromKeyEvent({
        altKey: false,
        ctrlKey: true,
        key: "Control",
        code: "ControlLeft",
        metaKey: false,
        shiftKey: false
      })
    ).toBeNull();
  });

  it("rejects unmodified key presses", () => {
    expect(
      buildShortcutAcceleratorFromKeyEvent({
        altKey: false,
        ctrlKey: false,
        key: "x",
        code: "KeyX",
        metaKey: false,
        shiftKey: false
      })
    ).toBeNull();
  });
});

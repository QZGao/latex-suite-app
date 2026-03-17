import { describe, expect, it } from "vitest";
import { extractAcceleratorModifierKeys } from "./shortcut-utils.js";

describe("extractAcceleratorModifierKeys", () => {
  it("returns Alt for the default Alt+X trigger", () => {
    expect(extractAcceleratorModifierKeys("Alt+X")).toEqual(["Alt"]);
  });

  it("returns Ctrl and Shift for multi-modifier accelerators", () => {
    expect(extractAcceleratorModifierKeys("Control+Shift+L")).toEqual([
      "Ctrl",
      "Shift"
    ]);
  });

  it("ignores non-modifier keys", () => {
    expect(extractAcceleratorModifierKeys("F10")).toEqual([]);
  });
});

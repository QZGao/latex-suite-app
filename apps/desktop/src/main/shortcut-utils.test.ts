import { DEFAULT_GLOBAL_SHORTCUT } from "@latex-suite/contracts";
import { describe, expect, it } from "vitest";
import { extractAcceleratorModifierKeys } from "./shortcut-utils.js";

describe("extractAcceleratorModifierKeys", () => {
  it("returns Ctrl for the default global shortcut", () => {
    expect(extractAcceleratorModifierKeys(DEFAULT_GLOBAL_SHORTCUT)).toEqual(["Ctrl"]);
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

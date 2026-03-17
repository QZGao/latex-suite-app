import { describe, expect, it } from "vitest";
import { formatNativeWindowHandle } from "./native-window-handle.js";

describe("formatNativeWindowHandle", () => {
  it("formats little-endian Electron window handles as uppercase hex strings", () => {
    expect(formatNativeWindowHandle(Uint8Array.from([0x7e, 0x08, 0x05, 0x00]))).toBe("0x5087E");
  });

  it("supports 64-bit handles", () => {
    expect(
      formatNativeWindowHandle(Uint8Array.from([0xef, 0xcd, 0xab, 0x90, 0x78, 0x56, 0x34, 0x12]))
    ).toBe("0x1234567890ABCDEF");
  });
});

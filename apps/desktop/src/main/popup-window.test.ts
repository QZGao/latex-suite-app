import { describe, expect, it } from "vitest";
import { resolvePreloadEntryPathWithExists } from "./popup-runtime-utils.js";

describe("resolvePreloadEntryPath", () => {
  it("prefers the built preload cjs bundle", () => {
    expect(
      resolvePreloadEntryPathWithExists(
        "D:/repo/apps/desktop/out/main",
        (path) => String(path).endsWith("index.cjs")
      )
    ).toBe(
      "D:\\repo\\apps\\desktop\\out\\preload\\index.cjs"
    );
  });

  it("falls back to index.mjs when cjs is unavailable", () => {
    expect(
      resolvePreloadEntryPathWithExists(
        "D:/repo/apps/desktop/out/main",
        (path) => String(path).endsWith("index.mjs")
      )
    ).toBe(
      "D:\\repo\\apps\\desktop\\out\\preload\\index.mjs"
    );
  });

  it("falls back to index.js when cjs and mjs are unavailable", () => {
    expect(
      resolvePreloadEntryPathWithExists(
        "D:/repo/apps/desktop/out/main",
        (path) => String(path).endsWith("index.js")
      )
    ).toBe(
      "D:\\repo\\apps\\desktop\\out\\preload\\index.js"
    );
  });
});

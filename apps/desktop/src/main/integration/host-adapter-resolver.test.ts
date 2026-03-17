import { describe, expect, it } from "vitest";
import type { HostContext } from "@latex-suite/contracts";
import { listHostAdapters, resolveHostAdapter } from "./host-adapter-resolver.js";

function createContext(processName: string): HostContext {
  return {
    hwnd: "0x1",
    processName,
    windowTitle: "fixture",
    bounds: { x: 0, y: 0, width: 100, height: 100 }
  };
}

describe("resolveHostAdapter", () => {
  it("returns notion adapter for Notion windows", () => {
    const adapter = resolveHostAdapter(createContext("Notion.exe"));
    expect(adapter.id).toBe("notion-formula");
  });

  it("matches notion regardless of process-name casing", () => {
    const adapter = resolveHostAdapter(createContext("NOTION.EXE"));
    expect(adapter.id).toBe("notion-formula");
  });

  it("falls back to generic adapter", () => {
    const adapter = resolveHostAdapter(createContext("Code.exe"));
    expect(adapter.id).toBe("generic");
  });

  it("returns the known adapters in matching order", () => {
    expect(listHostAdapters().map((adapter) => adapter.id)).toEqual([
      "notion-formula",
      "generic"
    ]);
  });
});

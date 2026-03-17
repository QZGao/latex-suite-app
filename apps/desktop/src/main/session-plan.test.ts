import { describe, expect, it } from "vitest";
import { resolveCommitPlan, resolveImportKeys } from "./session-plan.js";

describe("session plan", () => {
  it("returns clipboard probe keys for selection replace", () => {
    expect(resolveImportKeys("selection_replace")).toEqual(["Ctrl+C"]);
  });

  it("does not import host text in insert mode", () => {
    expect(resolveImportKeys("insert")).toEqual([]);
  });

  it("uses select-all capture keys for auto-selection sessions", () => {
    expect(resolveImportKeys("auto_selection_replace")).toEqual(["Ctrl+A", "Ctrl+C"]);
  });

  it("selects all before paste for auto-selection commits", () => {
    expect(resolveCommitPlan("auto_selection_replace")).toEqual({
      commitKeys: ["Ctrl+A", "Ctrl+V"]
    });
  });

  it("returns a no-op commit plan for empty insert sessions", () => {
    expect(resolveCommitPlan("insert", { hasText: false })).toEqual({
      commitKeys: []
    });
  });

  it("deletes the current selection for empty selection-replace sessions", () => {
    expect(
      resolveCommitPlan("selection_replace", {
        hasText: false,
        hadImportedText: true
      })
    ).toEqual({
      commitKeys: ["Delete"]
    });
  });

  it("does nothing for empty selection-replace sessions that started with no host selection", () => {
    expect(
      resolveCommitPlan("selection_replace", {
        hasText: false,
        hadImportedText: false
      })
    ).toEqual({
      commitKeys: []
    });
  });

  it("selects all and deletes for empty auto-selection sessions", () => {
    expect(resolveCommitPlan("auto_selection_replace", { hasText: false })).toEqual({
      commitKeys: ["Ctrl+A", "Delete"]
    });
  });
});

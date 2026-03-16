import { describe, expect, it } from "vitest";
import { resolveCommitPlan, resolveImportKeys, resolveInteractionProfileId } from "./session-plan.js";

describe("session plan", () => {
  it("does not let the generic adapter override the user default profile", () => {
    const profileId = resolveInteractionProfileId(
      {
        id: "generic",
        preferredProfile: "auto_selection_replace"
      },
      "selection_replace"
    );

    expect(profileId).toBe("selection_replace");
  });

  it("uses specific adapter preferences when present", () => {
    const profileId = resolveInteractionProfileId(
      {
        id: "notion-formula",
        preferredProfile: "auto_selection_replace"
      },
      "insert"
    );

    expect(profileId).toBe("auto_selection_replace");
  });

  it("returns clipboard probe keys for selection replace", () => {
    expect(
      resolveImportKeys("selection_replace", {
        id: "generic"
      })
    ).toEqual(["Ctrl+C"]);
  });

  it("returns select-all capture keys for adapter-driven sessions", () => {
    expect(
      resolveImportKeys("auto_selection_replace", {
        id: "notion-formula",
        captureBehavior: "select_all_copy"
      })
    ).toEqual(["Ctrl+A", "Ctrl+C"]);
  });

  it("includes finalize keys for auto selection adapters", () => {
    expect(
      resolveCommitPlan("auto_selection_replace", {
        id: "notion-formula",
        commitBehavior: "select_all_paste",
        postCommitKeys: ["Enter"]
      })
    ).toEqual({
      commitKeys: ["Ctrl+A", "Ctrl+V"],
      postCommitKeys: ["Enter"]
    });
  });
});

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

  it("keeps the user-selected profile even when a specific adapter has a preference", () => {
    const profileId = resolveInteractionProfileId(
      {
        id: "notion-formula",
        preferredProfile: "auto_selection_replace"
      },
      "insert"
    );

    expect(profileId).toBe("insert");
  });

  it("returns clipboard probe keys for selection replace", () => {
    expect(
      resolveImportKeys("selection_replace", {
        id: "generic"
      })
    ).toEqual(["Ctrl+C"]);
  });

  it("keeps selection replace on Ctrl+C even if an adapter prefers select-all capture", () => {
    expect(
      resolveImportKeys("selection_replace", {
        id: "custom-adapter",
        captureBehavior: "select_all_copy"
      })
    ).toEqual(["Ctrl+C"]);
  });

  it("does not import host text in insert mode even when an adapter supports capture", () => {
    expect(
      resolveImportKeys("insert", {
        id: "custom-adapter",
        captureBehavior: "select_all_copy"
      })
    ).toEqual([]);
  });

  it("returns select-all capture keys for adapter-driven sessions", () => {
    expect(
      resolveImportKeys("auto_selection_replace", {
        id: "notion-formula",
        captureBehavior: "select_all_copy"
      })
    ).toEqual(["Ctrl+A", "Ctrl+C"]);
  });

  it("uses select-all capture keys for generic auto-selection sessions", () => {
    expect(
      resolveImportKeys("auto_selection_replace", {
        id: "generic",
        captureBehavior: "select_all_copy"
      })
    ).toEqual(["Ctrl+A", "Ctrl+C"]);
  });

  it("uses selection probe keys for adapter-driven auto-selection sessions when requested", () => {
    expect(
      resolveImportKeys("auto_selection_replace", {
        id: "custom-adapter",
        captureBehavior: "selection_probe"
      })
    ).toEqual(["Ctrl+C"]);
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

  it("selects all before paste for generic auto-selection commits", () => {
    expect(
      resolveCommitPlan("auto_selection_replace", {
        id: "generic",
        commitBehavior: "select_all_paste"
      })
    ).toEqual({
      commitKeys: ["Ctrl+A", "Ctrl+V"],
      postCommitKeys: []
    });
  });

  it("uses plain paste for auto-selection adapters that do not need select-all", () => {
    expect(
      resolveCommitPlan("auto_selection_replace", {
        id: "custom-adapter",
        commitBehavior: "paste_over_selection",
        postCommitKeys: ["Enter"]
      })
    ).toEqual({
      commitKeys: ["Ctrl+V"],
      postCommitKeys: ["Enter"]
    });
  });

  it("returns a no-op commit plan for empty insert sessions", () => {
    expect(
      resolveCommitPlan(
        "insert",
        {
          id: "generic"
        },
        {
          hasText: false
        }
      )
    ).toEqual({
      commitKeys: [],
      postCommitKeys: []
    });
  });

  it("deletes the current selection for empty selection-replace sessions", () => {
    expect(
      resolveCommitPlan(
        "selection_replace",
        {
          id: "generic"
        },
        {
          hasText: false,
          hadImportedText: true
        }
      )
    ).toEqual({
      commitKeys: ["Delete"],
      postCommitKeys: []
    });
  });

  it("does nothing for empty selection-replace sessions that started with no host selection", () => {
    expect(
      resolveCommitPlan(
        "selection_replace",
        {
          id: "generic"
        },
        {
          hasText: false,
          hadImportedText: false
        }
      )
    ).toEqual({
      commitKeys: [],
      postCommitKeys: []
    });
  });

  it("does not leak finalize keys into selection-replace commits", () => {
    expect(
      resolveCommitPlan("selection_replace", {
        id: "notion-formula",
        commitBehavior: "select_all_paste",
        postCommitKeys: ["Enter"]
      })
    ).toEqual({
      commitKeys: ["Ctrl+V"],
      postCommitKeys: []
    });
  });

  it("selects all and deletes for empty auto-selection sessions", () => {
    expect(
      resolveCommitPlan(
        "auto_selection_replace",
        {
          id: "notion-formula",
          commitBehavior: "select_all_paste",
          postCommitKeys: ["Enter"]
        },
        {
          hasText: false
        }
      )
    ).toEqual({
      commitKeys: ["Ctrl+A", "Delete"],
      postCommitKeys: ["Enter"]
    });
  });

  it("keeps adapter finalize keys when empty auto-selection sessions only need a plain delete", () => {
    expect(
      resolveCommitPlan(
        "auto_selection_replace",
        {
          id: "custom-adapter",
          commitBehavior: "paste_over_selection",
          postCommitKeys: ["Tab"]
        },
        {
          hasText: false
        }
      )
    ).toEqual({
      commitKeys: ["Delete"],
      postCommitKeys: ["Tab"]
    });
  });
});

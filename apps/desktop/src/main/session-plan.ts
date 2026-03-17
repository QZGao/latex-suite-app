import type {
  HostAdapterDefinition,
  InteractionProfileId
} from "@latex-suite/contracts";

export interface SessionCommitPlan {
  commitKeys: string[];
  postCommitKeys: string[];
}

export interface ResolveCommitPlanOptions {
  hasText: boolean;
  hadImportedText?: boolean;
}

/**
 * The tray-selected profile is an explicit user choice and should not be
 * silently overridden by adapters. Adapter preferences remain useful for future
 * heuristics, but not for a forced user-selected mode.
 */
export function resolveInteractionProfileId(
  _adapter: HostAdapterDefinition,
  defaultProfileId: InteractionProfileId
): InteractionProfileId {
  return defaultProfileId;
}

/**
 * Returns the capture key sequence for the effective interaction profile.
 */
export function resolveImportKeys(
  profileId: InteractionProfileId,
  adapter: HostAdapterDefinition
): string[] {
  if (profileId === "insert") {
    return [];
  }

  if (profileId === "selection_replace") {
    return ["Ctrl+C"];
  }

  if (adapter.captureBehavior === "select_all_copy") {
    return ["Ctrl+A", "Ctrl+C"];
  }

  if (adapter.captureBehavior === "selection_probe") {
    return ["Ctrl+C"];
  }

  return [];
}

/**
 * Returns the write-back sequence for the effective interaction profile.
 */
export function resolveCommitPlan(
  profileId: InteractionProfileId,
  adapter: HostAdapterDefinition,
  options: ResolveCommitPlanOptions = { hasText: true }
): SessionCommitPlan {
  if (!options.hasText) {
    if (profileId === "insert") {
      return {
        commitKeys: [],
        postCommitKeys: []
      };
    }

    if (profileId === "selection_replace" && options.hadImportedText === false) {
      return {
        commitKeys: [],
        postCommitKeys: []
      };
    }

    if (profileId === "auto_selection_replace" && adapter.commitBehavior === "select_all_paste") {
      return {
        commitKeys: ["Ctrl+A", "Delete"],
        postCommitKeys: adapter.postCommitKeys ?? []
      };
    }

    return {
      commitKeys: ["Delete"],
      postCommitKeys: profileId === "auto_selection_replace" ? adapter.postCommitKeys ?? [] : []
    };
  }

  if (profileId === "auto_selection_replace") {
    return {
      commitKeys:
        adapter.commitBehavior === "select_all_paste"
          ? ["Ctrl+A", "Ctrl+V"]
          : ["Ctrl+V"],
      postCommitKeys: adapter.postCommitKeys ?? []
    };
  }

  if (profileId === "selection_replace") {
    return {
      commitKeys: ["Ctrl+V"],
      postCommitKeys: []
    };
  }

  return {
    commitKeys: ["Ctrl+V"],
    postCommitKeys: []
  };
}

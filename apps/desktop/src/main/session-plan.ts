import type {
  HostAdapterDefinition,
  InteractionProfileId
} from "@latex-suite/contracts";

export interface SessionCommitPlan {
  commitKeys: string[];
  postCommitKeys: string[];
}

/**
 * Adapter-specific profile preferences only apply to specific hosts, not the
 * generic fallback.
 */
export function resolveInteractionProfileId(
  adapter: HostAdapterDefinition,
  defaultProfileId: InteractionProfileId
): InteractionProfileId {
  if (adapter.id !== "generic" && adapter.preferredProfile) {
    return adapter.preferredProfile;
  }

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
  adapter: HostAdapterDefinition
): SessionCommitPlan {
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

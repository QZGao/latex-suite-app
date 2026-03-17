import type { InteractionProfileId } from "@latex-suite/contracts";

export interface SessionCommitPlan {
  commitKeys: string[];
}

export interface ResolveCommitPlanOptions {
  hasText: boolean;
  hadImportedText?: boolean;
}

export function resolveImportKeys(profileId: InteractionProfileId): string[] {
  if (profileId === "insert") {
    return [];
  }

  if (profileId === "selection_replace") {
    return ["Ctrl+C"];
  }

  return ["Ctrl+A", "Ctrl+C"];
}

/**
 * Returns the write-back sequence for the effective interaction profile.
 */
export function resolveCommitPlan(
  profileId: InteractionProfileId,
  options: ResolveCommitPlanOptions = { hasText: true }
): SessionCommitPlan {
  if (!options.hasText) {
    if (profileId === "insert") {
      return {
        commitKeys: []
      };
    }

    if (profileId === "selection_replace" && options.hadImportedText === false) {
      return {
        commitKeys: []
      };
    }

    if (profileId === "auto_selection_replace") {
      return {
        commitKeys: ["Ctrl+A", "Delete"]
      };
    }

    return {
      commitKeys: ["Delete"]
    };
  }

  if (profileId === "auto_selection_replace") {
    return {
      commitKeys: ["Ctrl+A", "Ctrl+V"]
    };
  }

  return {
    commitKeys: ["Ctrl+V"]
  };
}

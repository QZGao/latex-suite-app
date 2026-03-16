/**
 * User-facing composition modes. These stay small and fixed so the rest of the
 * app can reason about them without a plugin system.
 */
export type InteractionProfileId =
  | "insert"
  | "selection_replace"
  | "auto_selection_replace";

/**
 * How the session should import text into the popup.
 */
export type ImportStrategy = "none" | "selection_probe" | "adapter_driven";

/**
 * How the session should commit text back to the host.
 */
export type CommitBehavior =
  | "paste_at_caret"
  | "paste_over_selection"
  | "adapter_driven";

/**
 * Immutable definition of one interaction profile.
 */
export interface InteractionProfile {
  id: InteractionProfileId;
  label: string;
  importStrategy: ImportStrategy;
  commitBehavior: CommitBehavior;
}

/**
 * Fixed interaction profile table. The implementation can import this
 * everywhere without inventing a registry.
 */
export const INTERACTION_PROFILES: Record<InteractionProfileId, InteractionProfile> = {
  insert: {
    id: "insert",
    label: "Insert",
    importStrategy: "none",
    commitBehavior: "paste_at_caret"
  },
  selection_replace: {
    id: "selection_replace",
    label: "Selection Replace",
    importStrategy: "selection_probe",
    commitBehavior: "paste_over_selection"
  },
  auto_selection_replace: {
    id: "auto_selection_replace",
    label: "Auto Selection Replace",
    importStrategy: "adapter_driven",
    commitBehavior: "adapter_driven"
  }
};

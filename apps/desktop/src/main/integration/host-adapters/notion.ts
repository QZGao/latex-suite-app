import type { HostAdapterDefinition, HostContext } from "@latex-suite/contracts";

/**
 * Notion adapter with conservative matching. The actual automation sequence can
 * grow later without contaminating the generic path.
 */
export const NOTION_HOST_ADAPTER: HostAdapterDefinition & {
  matches(context: HostContext): boolean;
} = {
  id: "notion-formula",
  preferredProfile: "auto_selection_replace",
  captureBehavior: "select_all_copy",
  commitBehavior: "select_all_paste",
  postCommitKeys: ["Enter"],
  matches(context: HostContext): boolean {
    return context.processName.toLowerCase() === "notion.exe";
  }
};

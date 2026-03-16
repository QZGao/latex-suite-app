import type { HostAdapterDefinition, HostContext } from "@latex-suite/contracts";

/**
 * Generic adapter used when no better match exists.
 */
export const GENERIC_HOST_ADAPTER: HostAdapterDefinition & {
  matches(context: HostContext): boolean;
} = {
  id: "generic",
  captureBehavior: "selection_probe",
  postCommitKeys: [],
  matches(): boolean {
    return true;
  }
};

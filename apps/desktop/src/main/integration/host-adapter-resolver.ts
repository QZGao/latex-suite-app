import type { HostContext } from "@latex-suite/contracts";
import type { HostAdapterDefinition } from "@latex-suite/contracts";
import { GENERIC_HOST_ADAPTER } from "./host-adapters/generic.js";
import { NOTION_HOST_ADAPTER } from "./host-adapters/notion.js";

export interface HostAdapterWithMatcher extends HostAdapterDefinition {
  matches(context: HostContext): boolean;
}

const HOST_ADAPTERS: HostAdapterWithMatcher[] = [
  NOTION_HOST_ADAPTER,
  GENERIC_HOST_ADAPTER
];

/**
 * Resolves the first matching host adapter. Ordering is explicit and should
 * stay tiny; we do not want a registration system here.
 */
export function resolveHostAdapter(context: HostContext): HostAdapterWithMatcher {
  for (const adapter of HOST_ADAPTERS) {
    if (adapter.matches(context)) {
      return adapter;
    }
  }
  return GENERIC_HOST_ADAPTER;
}

/**
 * Returns the known adapter list for settings and diagnostics.
 */
export function listHostAdapters(): readonly HostAdapterWithMatcher[] {
  return HOST_ADAPTERS;
}

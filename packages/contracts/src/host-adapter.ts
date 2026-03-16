import type { InteractionProfileId } from "./interaction.js";

/**
 * Minimal host window context shared by the desktop shell.
 */
export interface HostBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Native window data used for adapter matching and popup placement.
 */
export interface HostContext {
  hwnd: string;
  processName: string;
  windowTitle: string;
  bounds: HostBounds;
  focusedElementName?: string;
  focusedElementRole?: string;
  focusedElementBounds?: HostBounds;
}

/**
 * Small host adapter contract. Complex app-specific behavior should live behind
 * this boundary instead of leaking into the session controller.
 */
export interface HostAdapterDefinition {
  id: string;
  preferredProfile?: InteractionProfileId;
  captureBehavior?: "select_all_copy" | "selection_probe" | "blank";
  commitBehavior?: "select_all_paste" | "paste_over_selection" | "paste_at_caret";
  postCommitKeys?: string[];
}

import type { HostContext } from "./host-adapter.js";
import type { InteractionProfileId } from "./interaction.js";

/**
 * Explicit session state machine. The implementation should only move between
 * these phases through one controller.
 */
export type SessionPhase =
  | "idle"
  | "capturing"
  | "showing_popup"
  | "editing"
  | "committing"
  | "restoring_clipboard"
  | "failed";

/**
 * State captured for one composition run.
 */
export interface ComposeSession {
  id: string;
  phase: SessionPhase;
  interactionProfileId: InteractionProfileId;
  source: HostContext;
  originalClipboardText?: string;
  importedText: string;
  editedText: string;
}

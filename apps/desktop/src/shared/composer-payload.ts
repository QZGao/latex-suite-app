import type { AppSettings } from "@latex-suite/contracts";

export interface ComposerSnippetPayload {
  builtInEnabled: boolean;
  userSnippetSource?: string;
  userVariableSource?: string;
}

export interface ComposerBootstrapPayload {
  sessionId: string;
  initialText: string;
  popup: AppSettings["popup"];
  snippets: ComposerSnippetPayload;
}

export interface ComposerCommitPayload {
  text: string;
}

export interface ComposerSessionMountedPayload {
  sessionId: string;
}

export interface ComposerFocusSnapshotPayload {
  sessionId: string;
  reason: string;
  hasDocumentFocus: boolean;
  activeElementTagName: string | null;
  activeElementClassName: string | null;
  activeElementRole: string | null;
  activeElementContentEditable: boolean;
  details?: Record<string, string | number | boolean | null>;
}

export const COMPOSER_IPC_CHANNELS = {
  getBootstrap: "composer:get-bootstrap",
  pushBootstrap: "composer:push-bootstrap",
  sessionMounted: "composer:session-mounted",
  focusSnapshot: "composer:focus-snapshot",
  commit: "composer:commit",
  discard: "composer:discard"
} as const;

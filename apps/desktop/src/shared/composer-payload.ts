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

export const COMPOSER_IPC_CHANNELS = {
  getBootstrap: "composer:get-bootstrap",
  commit: "composer:commit",
  discard: "composer:discard"
} as const;

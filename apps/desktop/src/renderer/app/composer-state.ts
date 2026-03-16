import type { ComposerBootstrapPayload } from "../../shared/composer-payload.js";

export interface ComposerState {
  sessionId: string;
  text: string;
  isBusy: boolean;
}

export function createInitialComposerState(
  payload: ComposerBootstrapPayload
): ComposerState {
  return {
    sessionId: payload.sessionId,
    text: payload.initialText,
    isBusy: false
  };
}

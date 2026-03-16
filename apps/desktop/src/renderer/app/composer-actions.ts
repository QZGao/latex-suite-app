import type { ComposerState } from "./composer-state.js";

export function setComposerText(
  state: ComposerState,
  text: string
): ComposerState {
  return {
    ...state,
    text
  };
}

export function setComposerBusy(
  state: ComposerState,
  isBusy: boolean
): ComposerState {
  return {
    ...state,
    isBusy
  };
}

import type {
  ComposerBootstrapPayload,
  ComposerCommitPayload
} from "../../shared/composer-payload.js";

export interface DesktopRendererApi {
  getComposerBootstrap(): Promise<ComposerBootstrapPayload>;
  commitComposer(payload: ComposerCommitPayload): Promise<void>;
  discardComposer(): Promise<void>;
}

declare global {
  interface Window {
    latexSuiteDesktop?: DesktopRendererApi;
  }
}

const FALLBACK_BOOTSTRAP: ComposerBootstrapPayload = {
  sessionId: "fallback-session",
  initialText: "\\frac{a}{b}",
  popup: {
    width: 520,
    minHeight: 260,
    previewRatio: 0.45,
    closeOnBlur: true
  },
  snippets: {
    builtInEnabled: true
  }
};

const fallbackApi: DesktopRendererApi = {
  async getComposerBootstrap(): Promise<ComposerBootstrapPayload> {
    return FALLBACK_BOOTSTRAP;
  },
  async commitComposer(): Promise<void> {},
  async discardComposer(): Promise<void> {}
};

/**
 * Returns the preload API, or a predictable fallback when tests run in jsdom.
 */
export function getRendererApi(): DesktopRendererApi {
  return window.latexSuiteDesktop ?? fallbackApi;
}

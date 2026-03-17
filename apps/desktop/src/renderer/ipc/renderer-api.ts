import {
  DEFAULT_APP_SETTINGS
} from "@latex-suite/contracts";
import type {
  ComposerBootstrapPayload,
  ComposerCommitPayload,
  ComposerFocusSnapshotPayload,
  ComposerSessionMountedPayload
} from "../../shared/composer-payload.js";
import type {
  DesktopSettingsPayload,
  OpenPathPayload,
  OpenPathResult,
  DesktopSettingsSaveResult,
  ShortcutCaptureStatePayload,
  UpdateDesktopSettingsPayload
} from "../../shared/settings-payload.js";

export interface DesktopRendererApi {
  getComposerBootstrap(): Promise<ComposerBootstrapPayload | null>;
  onComposerBootstrap(listener: (payload: ComposerBootstrapPayload) => void): () => void;
  commitComposer(payload: ComposerCommitPayload): Promise<void>;
  notifyComposerMounted(payload: ComposerSessionMountedPayload): void;
  notifyComposerFocusSnapshot(payload: ComposerFocusSnapshotPayload): void;
  discardComposer(): Promise<void>;
  getDesktopSettings(): Promise<DesktopSettingsPayload>;
  saveDesktopSettings(payload: UpdateDesktopSettingsPayload): Promise<DesktopSettingsSaveResult>;
  setDesktopShortcutCaptureState(payload: ShortcutCaptureStatePayload): void;
  openDesktopPath(payload: OpenPathPayload): Promise<OpenPathResult>;
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
  async getComposerBootstrap(): Promise<ComposerBootstrapPayload | null> {
    return FALLBACK_BOOTSTRAP;
  },
  onComposerBootstrap(): () => void {
    return () => {};
  },
  async commitComposer(): Promise<void> {},
  notifyComposerMounted(): void {},
  notifyComposerFocusSnapshot(): void {},
  async discardComposer(): Promise<void> {},
  async getDesktopSettings(): Promise<DesktopSettingsPayload> {
    return {
      shortcut: DEFAULT_APP_SETTINGS.shortcut,
      launchAtLogin: false,
      defaultInteractionProfile: DEFAULT_APP_SETTINGS.defaultInteractionProfile,
      snippets: {
        userSnippetFile: undefined,
        userVariableFile: undefined
      }
    };
  },
  async saveDesktopSettings(
    payload: UpdateDesktopSettingsPayload
  ): Promise<DesktopSettingsSaveResult> {
    return {
      ok: true,
      settings: {
        shortcut: payload.shortcut,
        launchAtLogin: payload.launchAtLogin,
        defaultInteractionProfile: payload.defaultInteractionProfile,
        snippets: {
          userSnippetFile: undefined,
          userVariableFile: undefined
        }
      }
    };
  },
  setDesktopShortcutCaptureState(): void {},
  async openDesktopPath(_payload: OpenPathPayload): Promise<OpenPathResult> {
    return {
      ok: false,
      error: "Desktop settings bridge is unavailable."
    };
  }
};

let hasWarnedAboutMissingPreloadApi = false;

/**
 * Returns the preload API, or a predictable fallback when tests run in jsdom.
 */
export function getRendererApi(): DesktopRendererApi {
  if (!window.latexSuiteDesktop && !hasWarnedAboutMissingPreloadApi) {
    hasWarnedAboutMissingPreloadApi = true;
    console.error(
      "[renderer] Missing preload API; falling back to test bootstrap. Commit/discard will be no-ops."
    );
  }

  return window.latexSuiteDesktop ?? fallbackApi;
}

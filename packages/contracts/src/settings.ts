import type { InteractionProfileId } from "./interaction.js";

/**
 * Desktop settings persisted on disk.
 */
export interface AppSettings {
  shortcut: string;
  defaultInteractionProfile: InteractionProfileId;
  popup: {
    width: number;
    minHeight: number;
    previewRatio: number;
    closeOnBlur: boolean;
  };
  snippets: {
    builtInEnabled: boolean;
    userSnippetFile?: string;
    userVariableFile?: string;
  };
  adapters: {
    enabledAdapterIds: string[];
  };
}

/**
 * Stable default settings used when no config file exists.
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  shortcut: "Alt+X",
  defaultInteractionProfile: "insert",
  popup: {
    width: 520,
    minHeight: 260,
    previewRatio: 0.45,
    closeOnBlur: true
  },
  snippets: {
    builtInEnabled: true
  },
  adapters: {
    enabledAdapterIds: ["generic", "notion-formula"]
  }
};

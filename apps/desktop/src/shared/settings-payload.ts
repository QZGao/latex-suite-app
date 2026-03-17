import type { InteractionProfileId } from "@latex-suite/contracts";

export interface DesktopSettingsPayload {
  shortcut: string;
  launchAtLogin: boolean;
  defaultInteractionProfile: InteractionProfileId;
  snippets: {
    userSnippetFile?: string;
    userVariableFile?: string;
  };
}

export interface UpdateDesktopSettingsPayload {
  shortcut: string;
  launchAtLogin: boolean;
  defaultInteractionProfile: InteractionProfileId;
}

export interface ShortcutCaptureStatePayload {
  active: boolean;
}

export interface OpenPathPayload {
  path: string;
}

export interface OpenPathResult {
  ok: boolean;
  error?: string;
}

export interface DesktopSettingsSaveResult {
  ok: boolean;
  settings: DesktopSettingsPayload;
  error?: string;
}

export const SETTINGS_IPC_CHANNELS = {
  getSettings: "settings:get",
  saveSettings: "settings:save",
  setShortcutCaptureState: "settings:set-shortcut-capture-state",
  openPath: "settings:open-path"
} as const;

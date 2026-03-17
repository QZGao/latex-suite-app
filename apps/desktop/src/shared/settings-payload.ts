import type { InteractionProfileId } from "@latex-suite/contracts";

export interface DesktopSettingsPayload {
  shortcut: string;
  launchAtLogin: boolean;
  defaultInteractionProfile: InteractionProfileId;
}

export interface UpdateDesktopSettingsPayload {
  shortcut: string;
  launchAtLogin: boolean;
  defaultInteractionProfile: InteractionProfileId;
}

export interface ShortcutCaptureStatePayload {
  active: boolean;
}

export interface DesktopSettingsSaveResult {
  ok: boolean;
  settings: DesktopSettingsPayload;
  error?: string;
}

export const SETTINGS_IPC_CHANNELS = {
  getSettings: "settings:get",
  saveSettings: "settings:save",
  setShortcutCaptureState: "settings:set-shortcut-capture-state"
} as const;

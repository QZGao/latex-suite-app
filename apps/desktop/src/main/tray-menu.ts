import type { MenuItemConstructorOptions } from "electron";
import {
  INTERACTION_PROFILES,
  INTERACTION_PROFILE_ORDER,
  type InteractionProfileId
} from "@latex-suite/contracts";

export interface TrayMenuHandlers {
  onCompose: () => void;
  onQuit: () => void;
  onSelectInteractionProfile: (profileId: InteractionProfileId) => void;
}

/**
 * Builds the tray menu from serializable state so it can be tested without an
 * Electron runtime.
 */
export function buildTrayMenuTemplate(
  selectedInteractionProfileId: InteractionProfileId,
  handlers: TrayMenuHandlers
): MenuItemConstructorOptions[] {
  const interactionProfileMenuItems: MenuItemConstructorOptions[] = INTERACTION_PROFILE_ORDER.map(
    (profileId) => ({
      label: INTERACTION_PROFILES[profileId].label,
      type: "radio",
      checked: selectedInteractionProfileId === profileId,
      click: () => {
        handlers.onSelectInteractionProfile(profileId);
      }
    })
  );

  return [
    {
      label: "Compose",
      click: handlers.onCompose
    },
    {
      type: "separator"
    },
    {
      label: "Mode",
      submenu: interactionProfileMenuItems
    },
    {
      type: "separator"
    },
    {
      label: "Quit",
      click: handlers.onQuit
    }
  ];
}

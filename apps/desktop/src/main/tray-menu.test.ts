import { describe, expect, it, vi } from "vitest";
import type { MenuItemConstructorOptions } from "electron";
import { buildTrayMenuTemplate } from "./tray-menu.js";

function getModeSubmenu(
  menuTemplate: MenuItemConstructorOptions[]
): MenuItemConstructorOptions[] {
  const modeMenu = menuTemplate.find((item) => item.label === "Mode");
  if (!modeMenu || !Array.isArray(modeMenu.submenu)) {
    throw new Error("Missing Mode submenu.");
  }

  return modeMenu.submenu;
}

describe("buildTrayMenuTemplate", () => {
  it("shows the three interaction profiles as radio items", () => {
    const menuTemplate = buildTrayMenuTemplate("selection_replace", {
      onCompose: vi.fn(),
      onQuit: vi.fn(),
      onSelectInteractionProfile: vi.fn()
    });

    const submenu = getModeSubmenu(menuTemplate);
    expect(
      submenu.map((item) => ({
        label: item.label,
        checked: item.checked,
        type: item.type
      }))
    ).toEqual([
      {
        label: "Insert",
        checked: false,
        type: "radio"
      },
      {
        label: "Selection Replace",
        checked: true,
        type: "radio"
      },
      {
        label: "Auto Selection Replace",
        checked: false,
        type: "radio"
      }
    ]);
  });

  it("wires submenu clicks to interaction profile selection", () => {
    const onSelectInteractionProfile = vi.fn();
    const menuTemplate = buildTrayMenuTemplate("insert", {
      onCompose: vi.fn(),
      onQuit: vi.fn(),
      onSelectInteractionProfile
    });

    const submenu = getModeSubmenu(menuTemplate);
    submenu[2]?.click?.({} as never, {} as never, {} as never);

    expect(onSelectInteractionProfile).toHaveBeenCalledWith("auto_selection_replace");
  });
});

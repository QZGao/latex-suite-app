/**
 * Extracts the modifier keys used by an Electron accelerator string so the
 * automation layer can wait for them to be released before sending host keys.
 */
export function extractAcceleratorModifierKeys(shortcut: string): string[] {
  const modifiers = new Set<string>();

  for (const token of shortcut.split("+")) {
    const normalizedToken = token.trim().toLowerCase();

    if (normalizedToken === "alt" || normalizedToken === "option") {
      modifiers.add("Alt");
      continue;
    }

    if (normalizedToken === "ctrl" || normalizedToken === "control" || normalizedToken === "cmdorctrl") {
      modifiers.add("Ctrl");
      continue;
    }

    if (normalizedToken === "shift") {
      modifiers.add("Shift");
    }
  }

  return [...modifiers];
}

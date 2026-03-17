const MODIFIER_ORDER = ["CommandOrControl", "Control", "Alt", "Shift", "Command", "Super"] as const;

const MODIFIER_ALIASES: Record<string, (typeof MODIFIER_ORDER)[number]> = {
  alt: "Alt",
  cmd: "Command",
  cmdorctrl: "CommandOrControl",
  command: "Command",
  commandorcontrol: "CommandOrControl",
  control: "Control",
  ctrl: "Control",
  meta: "Super",
  option: "Alt",
  shift: "Shift",
  super: "Super"
};

const KEY_ALIASES: Record<string, string> = {
  backspace: "Backspace",
  del: "Delete",
  delete: "Delete",
  down: "Down",
  end: "End",
  enter: "Enter",
  esc: "Escape",
  escape: "Escape",
  home: "Home",
  ins: "Insert",
  insert: "Insert",
  left: "Left",
  pagedown: "PageDown",
  pageup: "PageUp",
  plus: "Plus",
  return: "Enter",
  right: "Right",
  space: "Space",
  spacebar: "Space",
  tab: "Tab",
  up: "Up"
};

const CODE_ALIASES: Record<string, string> = {
  Backquote: "`",
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Comma: ",",
  Equal: "=",
  Minus: "-",
  Period: ".",
  Quote: "'",
  Semicolon: ";",
  Slash: "/"
};

export interface ShortcutKeyEvent {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  code?: string;
  metaKey: boolean;
  shiftKey: boolean;
}

function normalizeModifierToken(token: string): string | null {
  return MODIFIER_ALIASES[token.trim().toLowerCase()] ?? null;
}

function normalizeFunctionKey(token: string): string | null {
  return /^f\d{1,2}$/i.test(token) ? token.toUpperCase() : null;
}

function normalizeKeyToken(token: string): string {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error("Shortcut contains an empty token.");
  }

  const alias = KEY_ALIASES[trimmedToken.toLowerCase()];
  if (alias) {
    return alias;
  }

  const functionKey = normalizeFunctionKey(trimmedToken);
  if (functionKey) {
    return functionKey;
  }

  if (trimmedToken.length === 1) {
    return trimmedToken === " " ? "Space" : trimmedToken.toUpperCase();
  }

  throw new Error(`Unsupported shortcut key "${trimmedToken}".`);
}

export function normalizeShortcutAccelerator(shortcut: string): string {
  const tokens = shortcut
    .split("+")
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    throw new Error("Shortcut cannot be empty.");
  }

  const modifiers = new Set<string>();
  let keyToken: string | null = null;

  for (const token of tokens) {
    const modifier = normalizeModifierToken(token);
    if (modifier) {
      modifiers.add(modifier);
      continue;
    }

    if (keyToken) {
      throw new Error("Shortcut must include exactly one non-modifier key.");
    }

    keyToken = normalizeKeyToken(token);
  }

  if (!keyToken) {
    throw new Error("Shortcut must include a non-modifier key.");
  }

  if (modifiers.size === 0) {
    throw new Error("Shortcut must include at least one modifier key.");
  }

  return [...MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)), keyToken].join("+");
}

function isModifierOnlyKey(key: string): boolean {
  const normalizedKey = key.trim().toLowerCase();
  return normalizedKey === "alt" || normalizedKey === "control" || normalizedKey === "ctrl" || normalizedKey === "meta" || normalizedKey === "shift";
}

function normalizeShortcutKeyEventKey(event: ShortcutKeyEvent): string | null {
  if (event.code && /^Key[A-Z]$/.test(event.code)) {
    return event.code.slice(3);
  }

  if (event.code && /^Digit[0-9]$/.test(event.code)) {
    return event.code.slice(5);
  }

  if (event.code && /^F\d{1,2}$/.test(event.code)) {
    return event.code.toUpperCase();
  }

  if (event.code && CODE_ALIASES[event.code]) {
    return CODE_ALIASES[event.code];
  }

  if (isModifierOnlyKey(event.key)) {
    return null;
  }

  try {
    return normalizeKeyToken(event.key);
  } catch {
    return null;
  }
}

export function buildShortcutAcceleratorFromKeyEvent(event: ShortcutKeyEvent): string | null {
  const keyToken = normalizeShortcutKeyEventKey(event);
  if (!keyToken) {
    return null;
  }

  const tokens: string[] = [];
  if (event.ctrlKey) {
    tokens.push("Control");
  }
  if (event.altKey) {
    tokens.push("Alt");
  }
  if (event.shiftKey) {
    tokens.push("Shift");
  }
  if (event.metaKey) {
    tokens.push("Super");
  }
  tokens.push(keyToken);

  if (tokens.length < 2) {
    return null;
  }

  return normalizeShortcutAccelerator(tokens.join("+"));
}

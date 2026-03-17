import {
  DEFAULT_GLOBAL_SHORTCUT,
  INTERACTION_PROFILES,
  INTERACTION_PROFILE_ORDER,
  type InteractionProfileId
} from "@latex-suite/contracts";
import { buildShortcutAcceleratorFromKeyEvent } from "../../shared/shortcut-accelerator.js";
import { getRendererApi } from "../ipc/renderer-api.js";
import type { DesktopSettingsPayload } from "../../shared/settings-payload.js";

const INTERACTION_PROFILE_DESCRIPTIONS: Record<InteractionProfileId, string> = {
  insert: "Open the composer and insert the result at the caret.",
  selection_replace: "Import the current selection and replace only that selection when you commit.",
  auto_selection_replace:
    "Import the full field by selecting all, then replace the full field when you commit."
};

type StatusTone = "error" | "info" | "success";

interface DraftSettings {
  defaultInteractionProfile: InteractionProfileId;
  launchAtLogin: boolean;
  shortcut: string;
  userSnippetFile: string;
  userVariableFile: string;
}

interface SettingsLayout {
  closeButton: HTMLButtonElement;
  launchAtLoginCheckbox: HTMLInputElement;
  userSnippetFileInput: HTMLInputElement;
  userVariableFileInput: HTMLInputElement;
  modeInputs: HTMLInputElement[];
  resetButton: HTMLButtonElement;
  saveButton: HTMLButtonElement;
  shell: HTMLElement;
  shortcutInput: HTMLInputElement;
  statusMessage: HTMLElement;
}

function renderModeOptions(): string {
  return INTERACTION_PROFILE_ORDER.map((profileId) => {
    const profile = INTERACTION_PROFILES[profileId];
    return `
      <label class="settings-mode-option">
        <input
          class="settings-mode-input"
          type="radio"
          name="defaultInteractionProfile"
          value="${profile.id}"
        />
        <span class="settings-mode-copy">
          <span class="settings-mode-label">${profile.label}</span>
          <span class="settings-mode-description">${INTERACTION_PROFILE_DESCRIPTIONS[profile.id]}</span>
        </span>
      </label>
    `;
  }).join("");
}

function renderSettingsLayout(): SettingsLayout {
  const shell = document.createElement("main");
  shell.className = "settings-page";

  shell.innerHTML = `
    <section class="settings-header">
      <div>
        <h1 class="settings-title">Settings</h1>
        <p class="settings-subtitle">Preferences for how LaTeX Suite behaves.</p>
      </div>
    </section>

    <section class="settings-section">
      <div class="settings-section-copy">
        <h2 class="settings-section-title">Default mode</h2>
        <p class="settings-section-description">
          Choose how the composer should interact with the current app by default.
        </p>
      </div>

      <div class="settings-mode-list" role="radiogroup" aria-label="Default mode">
        ${renderModeOptions()}
      </div>
    </section>

    <section class="settings-section">
      <div class="settings-section-copy">
        <h2 class="settings-section-title">Global hotkey</h2>
        <p class="settings-section-description">
          Click the field and press the key combination that should open the composer from anywhere.
        </p>
      </div>

      <div class="settings-field-group">
        <input
          class="settings-shortcut-input"
          type="text"
          readonly
          spellcheck="false"
          aria-label="Global hotkey"
        />
        <div class="settings-inline-actions">
          <button class="settings-inline-button settings-reset-button" type="button">Reset default</button>
          <span class="settings-inline-hint">Use at least one modifier key, for example <code>${DEFAULT_GLOBAL_SHORTCUT}</code>.</span>
        </div>
      </div>
    </section>

    <section class="settings-section settings-section-toggle">
      <div class="settings-section-copy">
        <h2 class="settings-section-title">System startup</h2>
        <p class="settings-section-description">
          Start LaTeX Suite automatically when you sign in to Windows.
        </p>
      </div>

      <label class="settings-toggle-row">
        <input class="settings-checkbox" type="checkbox" />
        <span class="settings-toggle-label">Launch LaTeX Suite on system startup</span>
      </label>
    </section>

    <section class="settings-section">
      <div class="settings-section-copy">
        <h2 class="settings-section-title">Snippet files</h2>
        <p class="settings-section-description">
          Edit these files in your preferred editor. LaTeX Suite uses them as the full
          snippet and variable source, replacing the defaults when present.
        </p>
      </div>

      <div class="settings-field-group">
        <label class="settings-field-label" for="settings-user-snippet-file">Snippet file</label>
        <input
          id="settings-user-snippet-file"
          class="settings-path-input"
          type="text"
          readonly
          title="Double-click to open this file in the default app."
          spellcheck="false"
          aria-label="User snippet file path"
        />
      </div>

      <div class="settings-field-group">
        <label class="settings-field-label" for="settings-user-variable-file">Variable file</label>
        <input
          id="settings-user-variable-file"
          class="settings-path-input"
          type="text"
          readonly
          title="Double-click to open this file in the default app."
          spellcheck="false"
          aria-label="User variable file path"
        />
      </div>
    </section>

    <footer class="settings-footer">
      <p class="settings-status" data-tone="info"></p>
      <div class="settings-footer-actions">
        <button class="settings-footer-button settings-close-button" type="button">Close</button>
        <button class="settings-footer-button settings-save-button" type="button">Save changes</button>
      </div>
    </footer>
  `;

  const shortcutInput = shell.querySelector<HTMLInputElement>(".settings-shortcut-input");
  const launchAtLoginCheckbox = shell.querySelector<HTMLInputElement>(".settings-checkbox");
  const userSnippetFileInput = shell.querySelector<HTMLInputElement>("#settings-user-snippet-file");
  const userVariableFileInput = shell.querySelector<HTMLInputElement>("#settings-user-variable-file");
  const resetButton = shell.querySelector<HTMLButtonElement>(".settings-reset-button");
  const saveButton = shell.querySelector<HTMLButtonElement>(".settings-save-button");
  const closeButton = shell.querySelector<HTMLButtonElement>(".settings-close-button");
  const statusMessage = shell.querySelector<HTMLElement>(".settings-status");
  const modeInputs = Array.from(shell.querySelectorAll<HTMLInputElement>(".settings-mode-input"));

  if (
    !shortcutInput ||
    !launchAtLoginCheckbox ||
    !resetButton ||
    !userSnippetFileInput ||
    !userVariableFileInput ||
    !saveButton ||
    !closeButton ||
    !statusMessage ||
    modeInputs.length !== INTERACTION_PROFILE_ORDER.length
  ) {
    throw new Error("Settings layout failed to initialize.");
  }

  return {
    closeButton,
    launchAtLoginCheckbox,
    modeInputs,
    userSnippetFileInput,
    userVariableFileInput,
    resetButton,
    saveButton,
    shell,
    shortcutInput,
    statusMessage
  };
}

function setStatus(layout: SettingsLayout, tone: StatusTone, message: string): void {
  layout.statusMessage.dataset.tone = tone;
  layout.statusMessage.textContent = message;
}

function areSettingsEqual(left: DraftSettings, right: DraftSettings): boolean {
  return (
    left.shortcut === right.shortcut &&
    left.launchAtLogin === right.launchAtLogin &&
    left.defaultInteractionProfile === right.defaultInteractionProfile
  );
}

export async function mountSettingsApp(root: HTMLElement): Promise<void> {
  const api = getRendererApi();
  const layout = renderSettingsLayout();
  root.replaceChildren(layout.shell);

  let draftSettings: DraftSettings = {
    defaultInteractionProfile: "insert",
    userSnippetFile: "",
    userVariableFile: "",
    shortcut: "",
    launchAtLogin: false
  };
  let savedSettings: DraftSettings = {
    defaultInteractionProfile: "insert",
    userSnippetFile: "",
    userVariableFile: "",
    shortcut: "",
    launchAtLogin: false
  };
  let isSaving = false;
  let isShortcutCaptureActive = false;

  const toDraftSettings = (settings: DesktopSettingsPayload): DraftSettings => ({
    shortcut: settings.shortcut,
    launchAtLogin: settings.launchAtLogin,
    defaultInteractionProfile: settings.defaultInteractionProfile,
    userSnippetFile: settings.snippets?.userSnippetFile ?? "",
    userVariableFile: settings.snippets?.userVariableFile ?? ""
  });

  const setShortcutCaptureActive = (active: boolean): void => {
    if (isShortcutCaptureActive === active) {
      return;
    }

    isShortcutCaptureActive = active;
    api.setDesktopShortcutCaptureState({ active });
  };

  const openPath = async (label: string, path: string): Promise<void> => {
    const filePath = path.trim();
    if (!filePath) {
      setStatus(layout, "error", `No ${label} path is configured.`);
      return;
    }

    const result = await api.openDesktopPath({ path: filePath });
    if (!result.ok) {
      setStatus(layout, "error", result.error ?? `Failed to open ${label}.`);
      return;
    }

    setStatus(layout, "info", `${label} opened in your default editor.`);
  };

  const refreshActions = (): void => {
    const hasShortcut = draftSettings.shortcut.length > 0;
    const isDirty = !areSettingsEqual(draftSettings, savedSettings);

    layout.shortcutInput.disabled = isSaving;
    layout.launchAtLoginCheckbox.disabled = isSaving;
    layout.userSnippetFileInput.disabled = isSaving;
    layout.userVariableFileInput.disabled = isSaving;
    layout.closeButton.disabled = isSaving;
    layout.resetButton.disabled = isSaving || draftSettings.shortcut === DEFAULT_GLOBAL_SHORTCUT;
    layout.saveButton.disabled = isSaving || !hasShortcut || !isDirty;
    for (const modeInput of layout.modeInputs) {
      modeInput.disabled = isSaving;
    }
  };

  const installSnippetPathOpenHandlers = (): void => {
    layout.userSnippetFileInput.addEventListener("dblclick", () => {
      void openPath("Snippet file", layout.userSnippetFileInput.value);
    });
    layout.userVariableFileInput.addEventListener("dblclick", () => {
      void openPath("Variable file", layout.userVariableFileInput.value);
    });
  };

  const syncLayoutFromDraft = (): void => {
    layout.shortcutInput.value = draftSettings.shortcut;
    layout.launchAtLoginCheckbox.checked = draftSettings.launchAtLogin;
    layout.userSnippetFileInput.value = draftSettings.userSnippetFile;
    layout.userVariableFileInput.value = draftSettings.userVariableFile;
    for (const modeInput of layout.modeInputs) {
      modeInput.checked = modeInput.value === draftSettings.defaultInteractionProfile;
    }
    refreshActions();
  };

  try {
    const settings = await api.getDesktopSettings();
    savedSettings = toDraftSettings(settings);
    draftSettings = {
      ...savedSettings
    };
    syncLayoutFromDraft();
    setStatus(layout, "info", "Choose a mode, hotkey, or startup preference, then save.");
  } catch (error) {
    layout.shortcutInput.value = "";
    layout.userSnippetFileInput.value = "";
    layout.userVariableFileInput.value = "";
    layout.launchAtLoginCheckbox.checked = false;
    layout.shortcutInput.disabled = true;
    layout.userSnippetFileInput.disabled = true;
    layout.userVariableFileInput.disabled = true;
    layout.launchAtLoginCheckbox.disabled = true;
    layout.resetButton.disabled = true;
    layout.saveButton.disabled = true;
    for (const modeInput of layout.modeInputs) {
      modeInput.disabled = true;
    }
    setStatus(
      layout,
      "error",
      error instanceof Error ? error.message : "Failed to load the current desktop settings."
    );
    return;
  }

  installSnippetPathOpenHandlers();

  for (const modeInput of layout.modeInputs) {
    modeInput.addEventListener("change", () => {
      if (!modeInput.checked) {
        return;
      }

      draftSettings = {
        ...draftSettings,
        defaultInteractionProfile: modeInput.value as InteractionProfileId
      };
      refreshActions();
      setStatus(
        layout,
        "info",
        `${INTERACTION_PROFILES[draftSettings.defaultInteractionProfile].label} will be the default mode after you save.`
      );
    });
  }

  layout.shortcutInput.addEventListener("focus", () => {
    setShortcutCaptureActive(true);
    setStatus(layout, "info", "Press the new shortcut now.");
  });

  layout.shortcutInput.addEventListener("blur", () => {
    setShortcutCaptureActive(false);
  });

  layout.shortcutInput.addEventListener("keydown", (event) => {
    event.preventDefault();

    const shortcut = buildShortcutAcceleratorFromKeyEvent(event);
    if (!shortcut) {
      setStatus(layout, "error", "Use a modifier key together with one non-modifier key.");
      return;
    }

    draftSettings = {
      ...draftSettings,
      shortcut
    };
    syncLayoutFromDraft();
    setStatus(layout, "info", `Ready to save ${shortcut}.`);
  });

  layout.resetButton.addEventListener("click", () => {
    draftSettings = {
      ...draftSettings,
      shortcut: DEFAULT_GLOBAL_SHORTCUT
    };
    syncLayoutFromDraft();
    setStatus(layout, "info", `Shortcut reset to ${DEFAULT_GLOBAL_SHORTCUT}. Save to apply it.`);
  });

  layout.launchAtLoginCheckbox.addEventListener("change", () => {
    draftSettings = {
      ...draftSettings,
      launchAtLogin: layout.launchAtLoginCheckbox.checked
    };
    refreshActions();
    setStatus(
      layout,
      "info",
      layout.launchAtLoginCheckbox.checked
        ? "LaTeX Suite will launch on system startup after you save."
        : "LaTeX Suite will stop launching on system startup after you save."
    );
  });

  layout.closeButton.addEventListener("click", () => {
    setShortcutCaptureActive(false);
    window.close();
  });

  layout.saveButton.addEventListener("click", async () => {
    if (isSaving || areSettingsEqual(draftSettings, savedSettings)) {
      return;
    }

    isSaving = true;
    setShortcutCaptureActive(false);
    refreshActions();
    setStatus(layout, "info", "Saving settings...");

    try {
      const result = await api.saveDesktopSettings({
        shortcut: draftSettings.shortcut,
        launchAtLogin: draftSettings.launchAtLogin,
        defaultInteractionProfile: draftSettings.defaultInteractionProfile
      });

      if (!result.ok) {
        setStatus(layout, "error", result.error ?? "Failed to save settings.");
        draftSettings = toDraftSettings(result.settings);
        syncLayoutFromDraft();
        return;
      }

      savedSettings = toDraftSettings(result.settings);
      draftSettings = savedSettings;
      syncLayoutFromDraft();
      setStatus(layout, "success", "Settings saved.");
    } catch (error) {
      setStatus(layout, "error", error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      isSaving = false;
      refreshActions();
    }
  });

  window.addEventListener(
    "beforeunload",
    () => {
      setShortcutCaptureActive(false);
    },
    { once: true }
  );
}

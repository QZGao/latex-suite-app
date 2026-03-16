export interface PopupLayoutParts {
  shell: HTMLElement;
  preview: HTMLElement;
  editor: HTMLElement;
}

/**
 * Builds the static popup structure. The editor and preview internals are
 * mounted separately to keep this file layout-only.
 */
export function renderPopupLayout(): PopupLayoutParts {
  const shell = document.createElement("section");
  shell.className = "popup-shell";

  const previewPanel = document.createElement("div");
  previewPanel.className = "preview-panel";

  const preview = document.createElement("div");
  preview.className = "preview-surface";
  previewPanel.append(preview);

  const divider = document.createElement("div");
  divider.className = "popup-divider";

  const editorPanel = document.createElement("div");
  editorPanel.className = "editor-panel";

  const editor = document.createElement("div");
  editor.className = "editor-surface";
  editorPanel.append(editor);

  shell.append(previewPanel, divider, editorPanel);

  return {
    shell,
    preview,
    editor
  };
}

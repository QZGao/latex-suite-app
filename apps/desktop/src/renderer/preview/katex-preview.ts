import katex from "katex";

/**
 * Renders the current formula preview. Preview failures stay local and never
 * block editing.
 */
export function renderFormulaPreview(target: HTMLElement, text: string): void {
  if (text.trim().length === 0) {
    target.innerHTML = '<div class="preview-placeholder">Start typing LaTeX</div>';
    return;
  }

  try {
    target.innerHTML = katex.renderToString(text, {
      displayMode: true,
      throwOnError: false,
      strict: "warn"
    });
  } catch {
    target.textContent = text;
  }
}

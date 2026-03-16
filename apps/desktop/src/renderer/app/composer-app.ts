import type { ComposerState } from "./composer-state.js";
import { setComposerBusy, setComposerText } from "./composer-actions.js";
import { createInitialComposerState } from "./composer-state.js";
import { EditorHost } from "../editor/editor-host.js";
import { getRendererApi } from "../ipc/renderer-api.js";
import { renderFormulaPreview } from "../preview/katex-preview.js";
import { renderPopupLayout } from "../ui/popup-layout.js";

/**
 * Mounts the active composer session and wires the editor to preview + IPC.
 */
export async function mountComposerApp(root: HTMLElement): Promise<void> {
  const api = getRendererApi();
  const bootstrap = await api.getComposerBootstrap();
  let state = createInitialComposerState(bootstrap);

  const layout = renderPopupLayout();
  root.replaceChildren(layout.shell);
  renderFormulaPreview(layout.preview, state.text);

  const commit = async (): Promise<void> => {
    if (state.isBusy) {
      return;
    }

    state = setComposerBusy(state, true);
    await api.commitComposer({ text: state.text });
  };

  const discard = async (): Promise<void> => {
    if (state.isBusy) {
      return;
    }

    state = setComposerBusy(state, true);
    await api.discardComposer();
  };

  const editor = await EditorHost.create({
    parent: layout.editor,
    initialText: state.text,
    snippets: bootstrap.snippets,
    onChange(text) {
      state = setComposerText(state, text);
      renderFormulaPreview(layout.preview, text);
    },
    onCommit() {
      void commit();
    },
    onDiscard() {
      void discard();
    }
  });

  const blurHandler = (): void => {
    if (bootstrap.popup.closeOnBlur) {
      void commit();
    }
  };

  window.addEventListener("blur", blurHandler);
  editor.focus();

  // Cleanup is currently tied to the popup window lifecycle.
  window.addEventListener(
    "beforeunload",
    () => {
      window.removeEventListener("blur", blurHandler);
      editor.destroy();
    },
    { once: true }
  );
}

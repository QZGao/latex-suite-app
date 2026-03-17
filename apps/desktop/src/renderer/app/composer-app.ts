import type { ComposerBootstrapPayload } from "../../shared/composer-payload.js";
import { setComposerBusy, setComposerText } from "./composer-actions.js";
import { createInitialComposerState } from "./composer-state.js";
import { startComposerRuntime } from "./composer-runtime.js";
import { EditorHost } from "../editor/editor-host.js";
import { getRendererApi } from "../ipc/renderer-api.js";
import { renderFormulaPreview } from "../preview/katex-preview.js";
import { renderPopupLayout } from "../ui/popup-layout.js";

async function mountComposerSession(
  root: HTMLElement,
  bootstrap: ComposerBootstrapPayload
): Promise<() => void> {
  const api = getRendererApi();
  let state = createInitialComposerState(bootstrap);
  let editor: EditorHost | undefined;

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

  try {
    editor = await EditorHost.create({
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
  } catch (error) {
    console.error("[renderer] Failed to initialize editor host.", error);
    layout.editor.textContent =
      "Editor failed to initialize. Check the desktop log for diagnostics.";
    return () => {
      root.replaceChildren();
    };
  }

  const blurHandler = (): void => {
    if (bootstrap.popup.closeOnBlur) {
      void commit();
    }
  };

  const focusHandler = (): void => {
    editor?.focus();
  };

  window.addEventListener("blur", blurHandler);
  window.addEventListener("focus", focusHandler);
  editor.focus();
  requestAnimationFrame(() => {
    editor?.focus();
  });

  return () => {
    window.removeEventListener("blur", blurHandler);
    window.removeEventListener("focus", focusHandler);
    editor?.destroy();
    root.replaceChildren();
  };
}

/**
 * Mounts the active composer session and wires the editor to preview + IPC.
 */
export async function mountComposerApp(root: HTMLElement): Promise<void> {
  const api = getRendererApi();
  const dispose = await startComposerRuntime(root, api, mountComposerSession);

  window.addEventListener(
    "beforeunload",
    () => {
      dispose();
    },
    { once: true }
  );
}

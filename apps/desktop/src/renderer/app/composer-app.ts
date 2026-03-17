import type {
  ComposerBootstrapPayload,
  ComposerFocusSnapshotPayload
} from "../../shared/composer-payload.js";
import { bindComposerFocusHandlers } from "./composer-focus.js";
import { setComposerBusy, setComposerText } from "./composer-actions.js";
import { createInitialComposerState } from "./composer-state.js";
import { startComposerRuntime } from "./composer-runtime.js";
import { EditorHost } from "../editor/editor-host.js";
import { getRendererApi } from "../ipc/renderer-api.js";
import { renderFormulaPreview } from "../preview/katex-preview.js";
import { renderPopupLayout } from "../ui/popup-layout.js";

function describeActiveElement(): Record<string, string | boolean | null> {
  const activeElement = document.activeElement as HTMLElement | null;
  if (!activeElement) {
    return {
      activeElementTagName: null,
      activeElementClassName: null,
      activeElementRole: null,
      activeElementContentEditable: false
    };
  }

  return {
    activeElementTagName: activeElement.tagName,
    activeElementClassName: activeElement.className || null,
    activeElementRole: activeElement.getAttribute("role"),
    activeElementContentEditable: activeElement.isContentEditable
  };
}

function createFocusSnapshot(
  sessionId: string,
  reason: string,
  details?: Record<string, unknown>
): ComposerFocusSnapshotPayload {
  const activeElement = describeActiveElement();

  return {
    sessionId,
    reason,
    hasDocumentFocus: document.hasFocus(),
    activeElementTagName: activeElement.activeElementTagName,
    activeElementClassName: activeElement.activeElementClassName,
    activeElementRole: activeElement.activeElementRole,
    activeElementContentEditable: Boolean(activeElement.activeElementContentEditable),
    details: details
      ? Object.fromEntries(
          Object.entries(details).map(([key, value]) => [
            key,
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            value === null
              ? value
              : String(value)
          ])
        )
      : undefined
  };
}

async function mountComposerSession(
  root: HTMLElement,
  bootstrap: ComposerBootstrapPayload
): Promise<() => void> {
  const api = getRendererApi();
  let state = createInitialComposerState(bootstrap);
  let editor: EditorHost | undefined;
  let disposeFocusHandlers: (() => void) | undefined;

  const layout = renderPopupLayout();
  root.replaceChildren(layout.shell);
  renderFormulaPreview(layout.preview, state.text);

  const emitFocusSnapshot = (reason: string, details?: Record<string, unknown>): void => {
    const snapshot = createFocusSnapshot(bootstrap.sessionId, reason, details);
    api.notifyComposerFocusSnapshot(snapshot);
    console.info(`[renderer] ${reason} ${JSON.stringify(snapshot)}`);
  };

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

  disposeFocusHandlers = bindComposerFocusHandlers({
    editor,
    closeOnBlur: bootstrap.popup.closeOnBlur,
    commit: () => {
      void commit();
    },
    logger(message, payload) {
      emitFocusSnapshot(message, payload);
    }
  });
  editor.focus();

  api.notifyComposerMounted({ sessionId: bootstrap.sessionId });
  emitFocusSnapshot("Composer session mounted");

  return () => {
    disposeFocusHandlers?.();
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

import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import type { ComposerSnippetPayload } from "../../shared/composer-payload.js";
import { loadLatexSuiteExtensions } from "./latex-suite-adapter.js";

export interface EditorHostOptions {
  parent: HTMLElement;
  initialText: string;
  snippets: ComposerSnippetPayload;
  onChange(text: string): void;
  onCommit(): void;
  onDiscard(): void;
}

const popupEditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "transparent"
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "var(--font-mono)",
    padding: "18px 20px"
  },
  ".cm-content": {
    minHeight: "100%",
    color: "var(--color-editor-text)",
    caretColor: "var(--color-accent)"
  },
  ".cm-line": {
    padding: "0"
  },
  ".cm-gutters": {
    display: "none"
  },
  "&.cm-focused": {
    outline: "none"
  },
  ".cm-cursor": {
    borderLeftColor: "var(--color-accent)"
  },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "var(--color-selection)"
  }
});

/**
 * Thin wrapper around CodeMirror so the rest of the renderer does not own
 * editor lifecycle details.
 */
export class EditorHost {
  private readonly view: EditorView;

  private constructor(view: EditorView) {
    this.view = view;
  }

  static async create(options: EditorHostOptions): Promise<EditorHost> {
    const latexSuiteExtensions = await loadLatexSuiteExtensions(options.snippets);

    const view = new EditorView({
      state: EditorState.create({
        doc: options.initialText,
        extensions: [
          basicSetup,
          EditorView.lineWrapping,
          popupEditorTheme,
          keymap.of([
            {
              key: "Escape",
              run: () => {
                queueMicrotask(options.onCommit);
                return true;
              }
            },
            {
              key: "Shift-Escape",
              run: () => {
                queueMicrotask(options.onDiscard);
                return true;
              }
            }
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              options.onChange(update.state.doc.toString());
            }
          }),
          ...latexSuiteExtensions
        ] satisfies Extension[]
      }),
      parent: options.parent
    });

    return new EditorHost(view);
  }

  focus(): void {
    this.view.focus();
  }

  getValue(): string {
    return this.view.state.doc.toString();
  }

  destroy(): void {
    this.view.destroy();
  }
}

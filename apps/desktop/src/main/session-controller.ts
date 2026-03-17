import { randomUUID } from "node:crypto";
import { BrowserWindow, ipcMain } from "electron";
import type { AppSettings, ComposeSession } from "@latex-suite/contracts";
import {
  COMPOSER_IPC_CHANNELS,
  type ComposerBootstrapPayload,
  type ComposerCommitPayload
} from "../shared/composer-payload.js";
import { BridgeClient } from "./bridge-client.js";
import {
  resolveHostAdapter,
  type HostAdapterWithMatcher
} from "./integration/host-adapter-resolver.js";
import { log, logError } from "./logger.js";
import { createPopupWindow, positionPopupWindow } from "./popup-window.js";
import { resolveCommitPlan, resolveImportKeys, resolveInteractionProfileId } from "./session-plan.js";
import { readOptionalTextFile } from "./text-file-utils.js";

interface ActiveComposeSession extends ComposeSession {
  hostAdapter: HostAdapterWithMatcher;
}

/**
 * Owns the popup lifecycle and all host interaction for one active session.
 */
export class SessionController {
  private readonly bridgeClient: BridgeClient;
  private activeSession?: ActiveComposeSession;
  private bootstrapPayload?: ComposerBootstrapPayload;
  private popupWindow?: BrowserWindow;

  constructor(bridgeClient: BridgeClient = new BridgeClient()) {
    this.bridgeClient = bridgeClient;
    ipcMain.handle(COMPOSER_IPC_CHANNELS.getBootstrap, () => this.getBootstrapPayload());
    ipcMain.handle(COMPOSER_IPC_CHANNELS.commit, (_event, payload: ComposerCommitPayload) =>
      this.commit(payload)
    );
    ipcMain.handle(COMPOSER_IPC_CHANNELS.discard, () => this.discard());
  }

  async startSession(settings: AppSettings): Promise<void> {
    if (this.popupWindow?.isVisible()) {
      this.popupWindow.focus();
      return;
    }

    await this.bridgeClient.start();

    const source = await this.bridgeClient.getForegroundWindow();
    if (!source) {
      log("session", "No foreground host window was available.");
      return;
    }

    const hostAdapter = resolveHostAdapter(source);
    const interactionProfileId = resolveInteractionProfileId(
      hostAdapter,
      settings.defaultInteractionProfile
    );
    const originalClipboardText = await this.bridgeClient.readClipboardText();
    const importedText = await this.captureImportedText(
      interactionProfileId,
      hostAdapter,
      originalClipboardText
    );

    this.activeSession = {
      id: randomUUID(),
      phase: "editing",
      interactionProfileId,
      hostAdapterId: hostAdapter.id,
      hostAdapter,
      source,
      originalClipboardText,
      importedText,
      editedText: importedText,
      shouldFinalizeHost: (hostAdapter.postCommitKeys?.length ?? 0) > 0
    };

    this.bootstrapPayload = {
      sessionId: this.activeSession.id,
      initialText: importedText,
      popup: settings.popup,
      snippets: {
        builtInEnabled: settings.snippets.builtInEnabled,
        userSnippetSource: readOptionalTextFile(settings.snippets.userSnippetFile),
        userVariableSource: readOptionalTextFile(settings.snippets.userVariableFile)
      }
    };

    log("session", "Session captured.", {
      hostAdapterId: hostAdapter.id,
      interactionProfileId,
      importedTextLength: importedText.length,
      processName: source.processName
    });

    const popupWindow = this.ensurePopupWindow(settings);
    positionPopupWindow(popupWindow, settings.popup, source.bounds);
    popupWindow.show();
    popupWindow.focus();
  }

  async dispose(): Promise<void> {
    ipcMain.removeHandler(COMPOSER_IPC_CHANNELS.getBootstrap);
    ipcMain.removeHandler(COMPOSER_IPC_CHANNELS.commit);
    ipcMain.removeHandler(COMPOSER_IPC_CHANNELS.discard);
    await this.bridgeClient.dispose();
  }

  focusPopup(): void {
    this.popupWindow?.focus();
  }

  private ensurePopupWindow(settings: AppSettings): BrowserWindow {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      return this.popupWindow;
    }

    this.popupWindow = createPopupWindow(settings.popup);
    this.popupWindow.on("closed", () => {
      this.popupWindow = undefined;
    });
    return this.popupWindow;
  }

  private getBootstrapPayload(): ComposerBootstrapPayload {
    return (
      this.bootstrapPayload ?? {
        sessionId: randomUUID(),
        initialText: "",
        popup: {
          width: 520,
          minHeight: 260,
          previewRatio: 0.45,
          closeOnBlur: true
        },
        snippets: {
          builtInEnabled: true
        }
      }
    );
  }

  private async captureImportedText(
    interactionProfileId: ActiveComposeSession["interactionProfileId"],
    hostAdapter: HostAdapterWithMatcher,
    originalClipboardText: string
  ): Promise<string> {
    const importKeys = resolveImportKeys(interactionProfileId, hostAdapter);
    if (importKeys.length === 0) {
      return "";
    }

    const sentinel = `__latex-suite-probe__${randomUUID()}`;
    await this.bridgeClient.writeClipboardText({ text: sentinel });
    await this.bridgeClient.sendKeys({
      keys: importKeys,
      keyDelayMs: 50,
      settleDelayMs: 180
    });

    const capturedText = await this.bridgeClient.readClipboardText();
    await this.bridgeClient.writeClipboardText({ text: originalClipboardText });

    return capturedText === sentinel ? "" : capturedText;
  }

  private async commit(payload: ComposerCommitPayload): Promise<void> {
    const session = this.activeSession;
    if (!session) {
      return;
    }

    session.phase = "committing";
    session.editedText = payload.text;

    let shouldRestoreOriginalClipboard = false;

    try {
      await this.bridgeClient.writeClipboardText({ text: payload.text });

      const restoreResult = await this.bridgeClient.restoreFocus({
        hwnd: session.source.hwnd
      });
      const foregroundWindow = await this.bridgeClient.getForegroundWindow();

      if (
        !restoreResult.restored &&
        foregroundWindow?.hwnd.toLowerCase() !== session.source.hwnd.toLowerCase()
      ) {
        throw new Error("Failed to restore focus to the original host window.");
      }

      const commitPlan = resolveCommitPlan(
        session.interactionProfileId,
        session.hostAdapter
      );

      await this.bridgeClient.sendKeys({
        keys: commitPlan.commitKeys,
        keyDelayMs: 50,
        settleDelayMs: 150
      });

      if (commitPlan.postCommitKeys.length > 0) {
        await this.bridgeClient.sendKeys({
          keys: commitPlan.postCommitKeys,
          keyDelayMs: 50,
          settleDelayMs: 100
        });
      }

      shouldRestoreOriginalClipboard = true;

      log("session", "Session committed.", {
        sessionId: session.id,
        interactionProfileId: session.interactionProfileId,
        textLength: payload.text.length
      });
    } catch (error) {
      logError("session", "Commit failed; keeping final text on the clipboard.", error);
    } finally {
      if (shouldRestoreOriginalClipboard) {
        await this.bridgeClient.writeClipboardText({
          text: session.originalClipboardText ?? ""
        });
      }

      this.popupWindow?.hide();
      this.activeSession = undefined;
      this.bootstrapPayload = undefined;
    }
  }

  private async discard(): Promise<void> {
    if (!this.activeSession) {
      this.popupWindow?.hide();
      return;
    }

    log("session", "Session discarded.", {
      sessionId: this.activeSession.id
    });

    this.popupWindow?.hide();
    this.activeSession = undefined;
    this.bootstrapPayload = undefined;
  }
}

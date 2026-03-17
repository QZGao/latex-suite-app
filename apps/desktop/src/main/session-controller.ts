import { randomUUID } from "node:crypto";
import type { BrowserWindow as BrowserWindowType } from "electron/main";
import { performance } from "node:perf_hooks";
import type { AppSettings, ComposeSession } from "@latex-suite/contracts";
import {
  COMPOSER_IPC_CHANNELS,
  type ComposerBootstrapPayload,
  type ComposerCommitPayload,
  type ComposerFocusSnapshotPayload,
  type ComposerSessionMountedPayload
} from "../shared/composer-payload.js";
import { BridgeClient } from "./bridge-client.js";
import { BrowserWindow, ipcMain } from "./electron-main.js";
import {
  resolveHostAdapter,
  type HostAdapterWithMatcher
} from "./integration/host-adapter-resolver.js";
import { log, logError } from "./logger.js";
import { formatNativeWindowHandle } from "./native-window-handle.js";
import { schedulePopupBootstrapDelivery } from "./popup-bootstrap.js";
import { createPopupWindow, positionPopupWindow, showPopupWindow } from "./popup-window.js";
import { resolveCommitPlan, resolveImportKeys, resolveInteractionProfileId } from "./session-plan.js";
import { extractAcceleratorModifierKeys } from "./shortcut-utils.js";
import { readOptionalTextFile } from "./text-file-utils.js";
import { waitForClipboardCapture } from "./clipboard-probe.js";

interface ActiveComposeSession extends ComposeSession {
  hostAdapter: HostAdapterWithMatcher;
}

const POPUP_FOCUS_DIAGNOSTIC_DELAYS_MS = [0, 30, 90, 180, 320] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Owns the popup lifecycle and all host interaction for one active session.
 */
export class SessionController {
  private readonly bridgeClient: BridgeClient;
  private activeSession?: ActiveComposeSession;
  private bootstrapPayload?: ComposerBootstrapPayload;
  private mountedSessionId?: string;
  private popupWindow?: BrowserWindowType;

  constructor(bridgeClient: BridgeClient = new BridgeClient()) {
    this.bridgeClient = bridgeClient;
    ipcMain.handle(COMPOSER_IPC_CHANNELS.getBootstrap, () => this.getBootstrapPayload());
    ipcMain.handle(COMPOSER_IPC_CHANNELS.commit, (_event, payload: ComposerCommitPayload) =>
      this.commit(payload)
    );
    ipcMain.handle(COMPOSER_IPC_CHANNELS.discard, () => this.discard());
    ipcMain.on(COMPOSER_IPC_CHANNELS.sessionMounted, (_event, payload: ComposerSessionMountedPayload) => {
      this.handleComposerMounted(payload);
    });
    ipcMain.on(COMPOSER_IPC_CHANNELS.focusSnapshot, (_event, payload: ComposerFocusSnapshotPayload) => {
      void this.handleComposerFocusSnapshot(payload);
    });
  }

  async startSession(settings: AppSettings): Promise<void> {
    const sessionStart = performance.now();
    const triggerModifierKeys = extractAcceleratorModifierKeys(settings.shortcut);
    log("session", "Compose requested.", {
      defaultInteractionProfile: settings.defaultInteractionProfile
    });
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
    const popupWindow = this.ensurePopupWindow(settings);
    positionPopupWindow(popupWindow, settings.popup, source.bounds);

    const originalClipboardText = await this.bridgeClient.readClipboardText();
    const importStartedAt = performance.now();
    const importedText = await this.captureImportedText(
      interactionProfileId,
      hostAdapter,
      triggerModifierKeys
    );
    const importDurationMs = Math.round(performance.now() - importStartedAt);

    await this.waitForTriggerModifiersToRelease(triggerModifierKeys, interactionProfileId, "popup", 180);

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
    this.mountedSessionId = undefined;

    log("session", "Session captured.", {
      hostAdapterId: hostAdapter.id,
      interactionProfileId,
      importedTextLength: importedText.length,
      importedTextEndsWithNewline:
        importedText.endsWith("\n") || importedText.endsWith("\r\n"),
      processName: source.processName,
      importDurationMs,
      startupDurationMs: Math.round(performance.now() - sessionStart)
    });

    this.scheduleBootstrapDelivery(popupWindow, this.bootstrapPayload, this.activeSession.id);
    showPopupWindow(popupWindow);
    this.schedulePopupFocusDiagnostics(this.activeSession.id, popupWindow);
  }

  async dispose(): Promise<void> {
    ipcMain.removeHandler(COMPOSER_IPC_CHANNELS.getBootstrap);
    ipcMain.removeHandler(COMPOSER_IPC_CHANNELS.commit);
    ipcMain.removeHandler(COMPOSER_IPC_CHANNELS.discard);
    ipcMain.removeAllListeners(COMPOSER_IPC_CHANNELS.sessionMounted);
    ipcMain.removeAllListeners(COMPOSER_IPC_CHANNELS.focusSnapshot);
    await this.bridgeClient.dispose();
  }

  focusPopup(): void {
    if (!this.popupWindow || this.popupWindow.isDestroyed()) {
      return;
    }

    showPopupWindow(this.popupWindow);
  }

  async prewarm(): Promise<void> {
    await this.bridgeClient.start();
  }

  private async sendKeySequence(
    keys: string[],
    keyDelayMs: number,
    settleDelayMs: number
  ): Promise<void> {
    for (const key of keys) {
      await this.bridgeClient.sendKeys({
        keys: [key],
        keyDelayMs,
        settleDelayMs
      });
    }
  }

  private ensurePopupWindow(settings: AppSettings): BrowserWindow {
    if (this.popupWindow && !this.popupWindow.isDestroyed() && !this.popupWindow.isVisible()) {
      this.destroyPopupWindow();
    }

    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      return this.popupWindow;
    }

    this.popupWindow = createPopupWindow(settings.popup);
    this.popupWindow.on("closed", () => {
      this.popupWindow = undefined;
    });
    return this.popupWindow;
  }

  private destroyPopupWindow(): void {
    const popupWindow = this.popupWindow;
    this.popupWindow = undefined;

    if (!popupWindow || popupWindow.isDestroyed()) {
      return;
    }

    popupWindow.destroy();
  }

  private scheduleBootstrapDelivery(
    window: BrowserWindow,
    payload: ComposerBootstrapPayload,
    sessionId: string
  ): void {
    schedulePopupBootstrapDelivery({
      window,
      payload,
      isMounted: () => this.mountedSessionId === sessionId,
      logger(message, payload) {
        log("popup", message, {
          sessionId,
          ...payload
        });
      }
    });
  }

  private getBootstrapPayload(): ComposerBootstrapPayload | null {
    return this.bootstrapPayload ?? null;
  }

  private async captureImportedText(
    interactionProfileId: ActiveComposeSession["interactionProfileId"],
    hostAdapter: HostAdapterWithMatcher,
    triggerModifierKeys: string[]
  ): Promise<string> {
    const importKeys = resolveImportKeys(interactionProfileId, hostAdapter);
    if (importKeys.length === 0) {
      return "";
    }

    const firstAttempt = await this.performImportProbe(
      interactionProfileId,
      importKeys,
      "initial"
    );
    if (firstAttempt.length > 0) {
      return firstAttempt;
    }

    if (triggerModifierKeys.length === 0) {
      return "";
    }

    const releaseResult = await this.waitForTriggerModifiersToRelease(
      triggerModifierKeys,
      interactionProfileId,
      "import",
      220
    );
    if (!releaseResult.released) {
      return "";
    }

    log("session", "Retrying import probe after trigger modifiers were released.", {
      interactionProfileId,
      importKeys
    });
    return this.performImportProbe(interactionProfileId, importKeys, "retry");
  }

  private async performImportProbe(
    interactionProfileId: ActiveComposeSession["interactionProfileId"],
    importKeys: string[],
    attempt: "initial" | "retry"
  ): Promise<string> {
    const foregroundWindow = await this.bridgeClient.getForegroundWindow();
    log("session", "Preparing import probe.", {
      interactionProfileId,
      importKeys,
      attempt,
      foregroundHwnd: foregroundWindow?.hwnd ?? null,
      foregroundProcessName: foregroundWindow?.processName ?? null
    });

    const sentinel = `__latex-suite-probe__${randomUUID()}`;
    await this.bridgeClient.writeClipboardText({ text: sentinel });
    await this.sendKeySequence(importKeys, 18, 24);

    const capturedText = await waitForClipboardCapture(this.bridgeClient, {
      sentinel,
      timeoutMs: 220,
      pollIntervalMs: 8
    });

    if (capturedText === sentinel) {
      log("session", "Import probe did not capture text.", {
        interactionProfileId,
        importKeys,
        attempt
      });
      return "";
    }

    return capturedText;
  }

  private async waitForTriggerModifiersToRelease(
    triggerModifierKeys: string[],
    interactionProfileId: ActiveComposeSession["interactionProfileId"],
    phase: "import" | "popup",
    timeoutMs: number
  ): Promise<{
    released: boolean;
    remainingKeys: string[];
  }> {
    if (triggerModifierKeys.length === 0) {
      return {
        released: true,
        remainingKeys: []
      };
    }

    const releaseResult = await this.bridgeClient.waitForKeysReleased({
      keys: triggerModifierKeys,
      timeoutMs,
      pollIntervalMs: 8
    });

    if (!releaseResult.released) {
      log("session", "Trigger modifiers remained pressed.", {
        interactionProfileId,
        phase,
        remainingKeys: releaseResult.remainingKeys
      });
    }

    return releaseResult;
  }

  private async commit(payload: ComposerCommitPayload): Promise<void> {
    const session = this.activeSession;
    if (!session) {
      return;
    }
    const commitStartedAt = performance.now();

    session.phase = "committing";
    session.editedText = payload.text;

    let shouldRestoreOriginalClipboard = false;

    try {
      const focusState = await this.ensureForegroundWindow(session.source.hwnd);
      if (!focusState.restored) {
        throw new Error("Failed to restore focus to the original host window.");
      }

      const commitPlan = resolveCommitPlan(
        session.interactionProfileId,
        session.hostAdapter,
        {
          hasText: payload.text.length > 0,
          hadImportedText: session.importedText.length > 0
        }
      );

      if (payload.text.length > 0) {
        await this.bridgeClient.writeClipboardText({ text: payload.text });
        await sleep(10);
      }

      await this.sendKeySequence(commitPlan.commitKeys, 18, 30);

      if (commitPlan.postCommitKeys.length > 0) {
        await this.sendKeySequence(commitPlan.postCommitKeys, 18, 30);
      }

      shouldRestoreOriginalClipboard = true;

      log("session", "Session committed.", {
        sessionId: session.id,
        interactionProfileId: session.interactionProfileId,
        textLength: payload.text.length,
        committedTextEndsWithNewline:
          payload.text.endsWith("\n") || payload.text.endsWith("\r\n"),
        commitDurationMs: Math.round(performance.now() - commitStartedAt)
      });
    } catch (error) {
      logError("session", "Commit failed; keeping final text on the clipboard.", error);
    } finally {
      if (shouldRestoreOriginalClipboard) {
        await this.bridgeClient.writeClipboardText({
          text: session.originalClipboardText ?? ""
        });
      }

      this.destroyPopupWindow();
      this.activeSession = undefined;
      this.bootstrapPayload = undefined;
      this.mountedSessionId = undefined;
    }
  }

  private async ensureForegroundWindow(
    hwnd: string,
    maxAttempts = 5,
    delayMs = 50
  ): Promise<{
    restored: boolean;
    foregroundWindow: Awaited<ReturnType<BridgeClient["getForegroundWindow"]>>;
  }> {
    const normalizedHwnd = hwnd.toLowerCase();
    let foregroundWindow = await this.bridgeClient.getForegroundWindow();

    if (foregroundWindow?.hwnd.toLowerCase() === normalizedHwnd) {
      return {
        restored: true,
        foregroundWindow
      };
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.bridgeClient.restoreFocus({ hwnd });
      foregroundWindow = await this.bridgeClient.getForegroundWindow();

      if (foregroundWindow?.hwnd.toLowerCase() === normalizedHwnd) {
        return {
          restored: true,
          foregroundWindow
        };
      }

      if (attempt < maxAttempts - 1) {
        await sleep(delayMs);
      }
    }

    return {
      restored: false,
      foregroundWindow
    };
  }

  private async discard(): Promise<void> {
    const session = this.activeSession;
    if (!session) {
      this.popupWindow?.hide();
      return;
    }

    log("session", "Session discarded.", {
      sessionId: session.id
    });

    try {
      await this.bridgeClient.writeClipboardText({
        text: session.originalClipboardText ?? ""
      });
    } catch (error) {
      logError("session", "Failed to restore clipboard while discarding a session.", error);
    } finally {
      this.destroyPopupWindow();
      this.activeSession = undefined;
      this.bootstrapPayload = undefined;
      this.mountedSessionId = undefined;
    }
  }

  private handleComposerMounted(payload: ComposerSessionMountedPayload): void {
    if (!this.activeSession || payload.sessionId !== this.activeSession.id || !this.popupWindow) {
      return;
    }

    this.mountedSessionId = payload.sessionId;
    log("popup", "Composer session mounted.", {
      sessionId: payload.sessionId
    });
    showPopupWindow(this.popupWindow);
  }

  private schedulePopupFocusDiagnostics(
    sessionId: string,
    popupWindow: BrowserWindowType
  ): void {
    for (const delayMs of POPUP_FOCUS_DIAGNOSTIC_DELAYS_MS) {
      setTimeout(() => {
        void this.logPopupFocusSnapshot({
          sessionId,
          reason: `Main popup focus diagnostic (${delayMs}ms)`,
          popupWindow
        });
      }, delayMs);
    }
  }

  private async handleComposerFocusSnapshot(
    payload: ComposerFocusSnapshotPayload
  ): Promise<void> {
    await this.logPopupFocusSnapshot({
      sessionId: payload.sessionId,
      reason: payload.reason,
      rendererSnapshot: payload
    });
  }

  private async logPopupFocusSnapshot(options: {
    sessionId: string;
    reason: string;
    popupWindow?: BrowserWindowType;
    rendererSnapshot?: ComposerFocusSnapshotPayload;
  }): Promise<void> {
    if (!this.activeSession || this.activeSession.id !== options.sessionId) {
      return;
    }

    const popupWindow = options.popupWindow ?? this.popupWindow;
    const popupExists = Boolean(popupWindow && !popupWindow.isDestroyed());
    const foregroundWindow = await this.bridgeClient.getForegroundWindow().catch((error) => {
      logError("popup-focus", "Failed to query foreground window while collecting focus diagnostics.", error);
      return null;
    });

    log("popup-focus", options.reason, {
      sessionId: options.sessionId,
      interactionProfileId: this.activeSession.interactionProfileId,
      popupExists,
      popupVisible: popupExists ? popupWindow?.isVisible() : false,
      popupFocused: popupExists ? popupWindow?.isFocused() : false,
      popupHwnd:
        popupExists && popupWindow
          ? formatNativeWindowHandle(popupWindow.getNativeWindowHandle())
          : null,
      foregroundHwnd: foregroundWindow?.hwnd ?? null,
      foregroundProcessName: foregroundWindow?.processName ?? null,
      foregroundWindowTitle: foregroundWindow?.windowTitle ?? null,
      rendererHasDocumentFocus: options.rendererSnapshot?.hasDocumentFocus ?? null,
      rendererActiveElementTagName: options.rendererSnapshot?.activeElementTagName ?? null,
      rendererActiveElementClassName: options.rendererSnapshot?.activeElementClassName ?? null,
      rendererActiveElementRole: options.rendererSnapshot?.activeElementRole ?? null,
      rendererActiveElementContentEditable:
        options.rendererSnapshot?.activeElementContentEditable ?? null,
      rendererFocusDetails: options.rendererSnapshot?.details ?? null
    });
  }
}

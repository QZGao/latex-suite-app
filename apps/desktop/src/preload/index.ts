import {
  COMPOSER_IPC_CHANNELS,
  type ComposerBootstrapPayload,
  type ComposerCommitPayload,
  type ComposerFocusSnapshotPayload,
  type ComposerSessionMountedPayload
} from "../shared/composer-payload.js";
import { contextBridge, ipcRenderer } from "./electron-renderer.js";

/**
 * Narrow preload surface for the composer window.
 */
contextBridge.exposeInMainWorld("latexSuiteDesktop", {
  getComposerBootstrap(): Promise<ComposerBootstrapPayload | null> {
    return ipcRenderer.invoke(COMPOSER_IPC_CHANNELS.getBootstrap);
  },
  onComposerBootstrap(listener: (payload: ComposerBootstrapPayload) => void): () => void {
    const wrappedListener = (_event: Electron.IpcRendererEvent, payload: ComposerBootstrapPayload) => {
      listener(payload);
    };

    ipcRenderer.on(COMPOSER_IPC_CHANNELS.pushBootstrap, wrappedListener);
    return () => {
      ipcRenderer.removeListener(COMPOSER_IPC_CHANNELS.pushBootstrap, wrappedListener);
    };
  },
  commitComposer(payload: ComposerCommitPayload): Promise<void> {
    return ipcRenderer.invoke(COMPOSER_IPC_CHANNELS.commit, payload);
  },
  notifyComposerMounted(payload: ComposerSessionMountedPayload): void {
    ipcRenderer.send(COMPOSER_IPC_CHANNELS.sessionMounted, payload);
  },
  notifyComposerFocusSnapshot(payload: ComposerFocusSnapshotPayload): void {
    ipcRenderer.send(COMPOSER_IPC_CHANNELS.focusSnapshot, payload);
  },
  discardComposer(): Promise<void> {
    return ipcRenderer.invoke(COMPOSER_IPC_CHANNELS.discard);
  }
});

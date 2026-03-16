import { contextBridge, ipcRenderer } from "electron";
import {
  COMPOSER_IPC_CHANNELS,
  type ComposerBootstrapPayload,
  type ComposerCommitPayload
} from "../shared/composer-payload.js";

/**
 * Narrow preload surface for the composer window.
 */
contextBridge.exposeInMainWorld("latexSuiteDesktop", {
  getComposerBootstrap(): Promise<ComposerBootstrapPayload> {
    return ipcRenderer.invoke(COMPOSER_IPC_CHANNELS.getBootstrap);
  },
  commitComposer(payload: ComposerCommitPayload): Promise<void> {
    return ipcRenderer.invoke(COMPOSER_IPC_CHANNELS.commit, payload);
  },
  discardComposer(): Promise<void> {
    return ipcRenderer.invoke(COMPOSER_IPC_CHANNELS.discard);
  }
});

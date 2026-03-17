import { describe, expect, it, vi } from "vitest";
import type { ComposerBootstrapPayload } from "../../shared/composer-payload.js";
import {
  startComposerRuntime,
  type ComposerBootstrapSource,
  type MountComposerSession
} from "./composer-runtime.js";

function createBootstrap(sessionId: string, initialText: string): ComposerBootstrapPayload {
  return {
    sessionId,
    initialText,
    popup: {
      width: 520,
      minHeight: 260,
      previewRatio: 0.45,
      closeOnBlur: true
    },
    snippets: {
      builtInEnabled: true
    }
  };
}

describe("startComposerRuntime", () => {
  it("remounts the composer when a new session bootstrap arrives", async () => {
    const initialBootstrap = createBootstrap("session-1", "alpha");
    const nextBootstrap = createBootstrap("session-2", "beta");
    const mountedSessionIds: string[] = [];
    const cleanupSpies = [vi.fn(), vi.fn()];
    let bootstrapListener: ((payload: ComposerBootstrapPayload) => void) | undefined;

    const source: ComposerBootstrapSource = {
      async getComposerBootstrap(): Promise<ComposerBootstrapPayload | null> {
        return initialBootstrap;
      },
      onComposerBootstrap(listener): () => void {
        bootstrapListener = listener;
        return () => {
          bootstrapListener = undefined;
        };
      }
    };

    const mountSession: MountComposerSession = async (_root, bootstrap) => {
      mountedSessionIds.push(bootstrap.sessionId);
      return cleanupSpies[mountedSessionIds.length - 1]!;
    };

    const dispose = await startComposerRuntime({} as HTMLElement, source, mountSession);
    expect(mountedSessionIds).toEqual(["session-1"]);

    bootstrapListener?.(nextBootstrap);
    await Promise.resolve();

    expect(cleanupSpies[0]).toHaveBeenCalledTimes(1);
    expect(mountedSessionIds).toEqual(["session-1", "session-2"]);

    dispose();

    expect(cleanupSpies[1]).toHaveBeenCalledTimes(1);
    expect(bootstrapListener).toBeUndefined();
  });

  it("disposes stale async mounts when a newer bootstrap overtakes them", async () => {
    const sourceListeners: Array<(payload: ComposerBootstrapPayload) => void> = [];
    const staleCleanup = vi.fn();
    const currentCleanup = vi.fn();
    let resolveFirstMount: (() => void) | undefined;
    const mountedSessionIds: string[] = [];

    const source: ComposerBootstrapSource = {
      async getComposerBootstrap(): Promise<ComposerBootstrapPayload | null> {
        return createBootstrap("session-1", "alpha");
      },
      onComposerBootstrap(listener): () => void {
        sourceListeners.push(listener);
        return () => {
          const index = sourceListeners.indexOf(listener);
          if (index >= 0) {
            sourceListeners.splice(index, 1);
          }
        };
      }
    };

    const mountSession: MountComposerSession = async (_root, bootstrap) => {
      mountedSessionIds.push(bootstrap.sessionId);

      if (bootstrap.sessionId === "session-1") {
        await new Promise<void>((resolve) => {
          resolveFirstMount = resolve;
        });
        return staleCleanup;
      }

      return currentCleanup;
    };

    const runtimePromise = startComposerRuntime({} as HTMLElement, source, mountSession);
    await Promise.resolve();

    sourceListeners[0]?.(createBootstrap("session-2", "beta"));
    await Promise.resolve();
    resolveFirstMount?.();

    const dispose = await runtimePromise;
    await Promise.resolve();

    expect(mountedSessionIds).toEqual(["session-1", "session-2"]);
    expect(staleCleanup).toHaveBeenCalledTimes(1);
    expect(currentCleanup).not.toHaveBeenCalled();

    dispose();
    expect(currentCleanup).toHaveBeenCalledTimes(1);
  });

  it("cleans up every stale mount when several bootstraps arrive back-to-back", async () => {
    const sourceListeners: Array<(payload: ComposerBootstrapPayload) => void> = [];
    const cleanupSpies = [vi.fn(), vi.fn(), vi.fn()];
    const resolveMounts = new Map<string, () => void>();

    const source: ComposerBootstrapSource = {
      async getComposerBootstrap(): Promise<ComposerBootstrapPayload | null> {
        return createBootstrap("session-1", "alpha");
      },
      onComposerBootstrap(listener): () => void {
        sourceListeners.push(listener);
        return () => {
          const index = sourceListeners.indexOf(listener);
          if (index >= 0) {
            sourceListeners.splice(index, 1);
          }
        };
      }
    };

    const mountSession: MountComposerSession = async (_root, bootstrap) => {
      const cleanup = cleanupSpies[Number(bootstrap.sessionId.split("-")[1]) - 1] ?? vi.fn();

      await new Promise<void>((resolve) => {
        resolveMounts.set(bootstrap.sessionId, resolve);
      });

      return cleanup;
    };

    const runtimePromise = startComposerRuntime({} as HTMLElement, source, mountSession);
    await Promise.resolve();

    sourceListeners[0]?.(createBootstrap("session-2", "beta"));
    sourceListeners[0]?.(createBootstrap("session-3", "gamma"));
    await Promise.resolve();

    resolveMounts.get("session-1")?.();
    resolveMounts.get("session-2")?.();
    resolveMounts.get("session-3")?.();

    const dispose = await runtimePromise;
    await Promise.resolve();

    expect(cleanupSpies[0]).toHaveBeenCalledTimes(1);
    expect(cleanupSpies[1]).toHaveBeenCalledTimes(1);
    expect(cleanupSpies[2]).not.toHaveBeenCalled();

    dispose();
    expect(cleanupSpies[2]).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes from future bootstraps after disposal", async () => {
    let bootstrapListener: ((payload: ComposerBootstrapPayload) => void) | undefined;
    const cleanupSpy = vi.fn();
    const mountSpy = vi.fn<MountComposerSession>(async () => cleanupSpy);

    const source: ComposerBootstrapSource = {
      async getComposerBootstrap(): Promise<ComposerBootstrapPayload | null> {
        return createBootstrap("session-1", "alpha");
      },
      onComposerBootstrap(listener): () => void {
        bootstrapListener = listener;
        return () => {
          bootstrapListener = undefined;
        };
      }
    };

    const dispose = await startComposerRuntime({} as HTMLElement, source, mountSpy);
    expect(mountSpy).toHaveBeenCalledTimes(1);

    dispose();
    bootstrapListener?.(createBootstrap("session-2", "beta"));
    await Promise.resolve();

    expect(cleanupSpy).toHaveBeenCalledTimes(1);
    expect(mountSpy).toHaveBeenCalledTimes(1);
    expect(bootstrapListener).toBeUndefined();
  });

  it("ignores duplicate bootstraps for the same session id", async () => {
    let bootstrapListener: ((payload: ComposerBootstrapPayload) => void) | undefined;
    const cleanupSpy = vi.fn();
    const mountSpy = vi.fn<MountComposerSession>(async () => cleanupSpy);
    const bootstrap = createBootstrap("session-1", "alpha");

    const source: ComposerBootstrapSource = {
      async getComposerBootstrap(): Promise<ComposerBootstrapPayload | null> {
        return bootstrap;
      },
      onComposerBootstrap(listener): () => void {
        bootstrapListener = listener;
        return () => {
          bootstrapListener = undefined;
        };
      }
    };

    const dispose = await startComposerRuntime({} as HTMLElement, source, mountSpy);

    bootstrapListener?.(bootstrap);
    bootstrapListener?.(bootstrap);
    await Promise.resolve();

    expect(mountSpy).toHaveBeenCalledTimes(1);
    expect(cleanupSpy).not.toHaveBeenCalled();

    dispose();
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it("stays idle until a real bootstrap is pushed", async () => {
    let bootstrapListener: ((payload: ComposerBootstrapPayload) => void) | undefined;
    const mountSpy = vi.fn<MountComposerSession>(async () => vi.fn());

    const source: ComposerBootstrapSource = {
      async getComposerBootstrap(): Promise<ComposerBootstrapPayload | null> {
        return null;
      },
      onComposerBootstrap(listener): () => void {
        bootstrapListener = listener;
        return () => {
          bootstrapListener = undefined;
        };
      }
    };

    const dispose = await startComposerRuntime({} as HTMLElement, source, mountSpy);
    expect(mountSpy).not.toHaveBeenCalled();

    bootstrapListener?.(createBootstrap("session-1", "alpha"));
    await Promise.resolve();

    expect(mountSpy).toHaveBeenCalledTimes(1);
    dispose();
  });
});

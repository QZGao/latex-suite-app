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
      async getComposerBootstrap(): Promise<ComposerBootstrapPayload> {
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
      async getComposerBootstrap(): Promise<ComposerBootstrapPayload> {
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
});

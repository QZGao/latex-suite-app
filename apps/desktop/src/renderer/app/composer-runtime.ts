import type { ComposerBootstrapPayload } from "../../shared/composer-payload.js";

export interface ComposerBootstrapSource {
  getComposerBootstrap(): Promise<ComposerBootstrapPayload | null>;
  onComposerBootstrap(listener: (payload: ComposerBootstrapPayload) => void): () => void;
}

export type ComposerSessionCleanup = () => void;

export type MountComposerSession = (
  root: HTMLElement,
  bootstrap: ComposerBootstrapPayload
) => Promise<ComposerSessionCleanup>;

/**
 * Coordinates popup session remounts so the same renderer window can be reused
 * safely across many compose sessions.
 */
export async function startComposerRuntime(
  root: HTMLElement,
  source: ComposerBootstrapSource,
  mountSession: MountComposerSession
): Promise<ComposerSessionCleanup> {
  let activeCleanup: ComposerSessionCleanup = () => {};
  let mountGeneration = 0;
  let activeSessionId: string | undefined;

  const activateSession = async (bootstrap: ComposerBootstrapPayload): Promise<void> => {
    if (bootstrap.sessionId === activeSessionId) {
      return;
    }

    activeSessionId = bootstrap.sessionId;
    const generation = ++mountGeneration;

    activeCleanup();
    activeCleanup = () => {};

    const cleanup = await mountSession(root, bootstrap);
    if (generation !== mountGeneration) {
      cleanup();
      return;
    }

    activeCleanup = cleanup;
  };

  const unsubscribe = source.onComposerBootstrap((bootstrap) => {
    void activateSession(bootstrap);
  });

  const initialBootstrap = await source.getComposerBootstrap();
  if (initialBootstrap) {
    await activateSession(initialBootstrap);
  }

  return () => {
    mountGeneration++;
    activeSessionId = undefined;
    unsubscribe();
    activeCleanup();
    activeCleanup = () => {};
  };
}

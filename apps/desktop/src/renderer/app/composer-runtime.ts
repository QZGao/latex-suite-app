import type { ComposerBootstrapPayload } from "../../shared/composer-payload.js";

export interface ComposerBootstrapSource {
  getComposerBootstrap(): Promise<ComposerBootstrapPayload>;
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

  const activateSession = async (bootstrap: ComposerBootstrapPayload): Promise<void> => {
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

  await activateSession(await source.getComposerBootstrap());

  return () => {
    mountGeneration++;
    unsubscribe();
    activeCleanup();
    activeCleanup = () => {};
  };
}

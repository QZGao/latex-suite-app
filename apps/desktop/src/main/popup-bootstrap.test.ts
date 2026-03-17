import { describe, expect, it, vi } from "vitest";
import {
  schedulePopupBootstrapDelivery,
  type PopupBootstrapWindow
} from "./popup-bootstrap.js";

function createPayload(sessionId: string) {
  return {
    sessionId,
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
  };
}

function createWindowState(): PopupBootstrapWindow & {
  sentPayloads: Array<{ channel: string; payloadSessionId: string }>;
  loading: boolean;
  url: string;
  destroyed: boolean;
} {
  const state: PopupBootstrapWindow & {
    sentPayloads: Array<{ channel: string; payloadSessionId: string }>;
    loading: boolean;
    url: string;
    destroyed: boolean;
  } = {
    sentPayloads: [] as Array<{ channel: string; payloadSessionId: string }>,
    loading: false,
    url: "file:///renderer/index.html",
    destroyed: false,
    isDestroyed() {
      return state.destroyed;
    },
    webContents: {
      isLoadingMainFrame() {
        return state.loading;
      },
      getURL() {
        return state.url;
      },
      send(channel, payload) {
        state.sentPayloads.push({
          channel,
          payloadSessionId: payload.sessionId
        });
      }
    }
  };

  return state;
}

describe("schedulePopupBootstrapDelivery", () => {
  it("pushes immediately and on retries until the renderer mounts", () => {
    const scheduledCallbacks: Array<() => void> = [];
    const windowState = createWindowState();
    let mounted = false;

    schedulePopupBootstrapDelivery({
      window: windowState,
      payload: createPayload("session-1"),
      isMounted: () => mounted,
      schedule(callback) {
        scheduledCallbacks.push(callback);
      }
    });

    expect(windowState.sentPayloads).toHaveLength(1);

    scheduledCallbacks[0]?.();
    scheduledCallbacks[1]?.();
    expect(windowState.sentPayloads).toHaveLength(3);

    mounted = true;
    for (const callback of scheduledCallbacks.slice(2)) {
      callback();
    }

    expect(windowState.sentPayloads).toHaveLength(3);
  });

  it("keeps retrying while the renderer is still loading", () => {
    const scheduledCallbacks: Array<() => void> = [];
    const windowState = createWindowState();
    windowState.loading = true;

    schedulePopupBootstrapDelivery({
      window: windowState,
      payload: createPayload("session-2"),
      isMounted: () => false,
      schedule(callback) {
        scheduledCallbacks.push(callback);
      }
    });

    expect(windowState.sentPayloads).toHaveLength(0);

    scheduledCallbacks[0]?.();
    scheduledCallbacks[1]?.();
    expect(windowState.sentPayloads).toHaveLength(0);

    windowState.loading = false;
    scheduledCallbacks[2]?.();

    expect(windowState.sentPayloads).toEqual([
      {
        channel: "composer:push-bootstrap",
        payloadSessionId: "session-2"
      }
    ]);
  });

  it("logs the retry state transitions", () => {
    const logger = vi.fn();

    schedulePopupBootstrapDelivery({
      window: createWindowState(),
      payload: createPayload("session-3"),
      isMounted: () => false,
      schedule: vi.fn(),
      logger
    });

    expect(logger).toHaveBeenCalledWith("Popup bootstrap pushed.", {
      delayMs: null
    });
  });
});

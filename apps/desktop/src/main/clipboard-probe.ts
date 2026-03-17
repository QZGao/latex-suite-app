export interface ClipboardCapturePoller {
  readClipboardText(): Promise<string>;
}

export interface WaitForClipboardCaptureOptions {
  sentinel: string;
  timeoutMs: number;
  pollIntervalMs: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Polls for clipboard text captured by a probe sequence.
 *
 * During a copy operation some hosts temporarily leave the clipboard without a
 * text payload. Treat that transient empty state as "not ready yet" instead of
 * as a successful empty import.
 */
export async function waitForClipboardCapture(
  poller: ClipboardCapturePoller,
  options: WaitForClipboardCaptureOptions
): Promise<string> {
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const deadline = now() + options.timeoutMs;

  while (now() <= deadline) {
    const clipboardText = await poller.readClipboardText();
    if (clipboardText !== options.sentinel && clipboardText.length > 0) {
      return clipboardText;
    }

    await sleep(options.pollIntervalMs);
  }

  return options.sentinel;
}

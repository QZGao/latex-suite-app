import { describe, expect, it, vi } from "vitest";
import { waitForClipboardCapture } from "./clipboard-probe.js";

function createPoller(sequence: string[]) {
  let index = 0;

  return {
    async readClipboardText(): Promise<string> {
      const value = sequence[Math.min(index, sequence.length - 1)] ?? "";
      index += 1;
      return value;
    }
  };
}

describe("clipboard probe", () => {
  it("returns copied text immediately when the first read is already captured", async () => {
    const capturedText = await waitForClipboardCapture(createPoller(["\\beta"]), {
      sentinel: "sentinel",
      timeoutMs: 100,
      pollIntervalMs: 1
    });

    expect(capturedText).toBe("\\beta");
  });

  it("waits through transient empty clipboard states until copied text arrives", async () => {
    let nowValue = 0;
    const capturedText = await waitForClipboardCapture(createPoller(["sentinel", "", "\\alpha"]), {
      sentinel: "sentinel",
      timeoutMs: 100,
      pollIntervalMs: 1,
      sleep: vi.fn(async () => {
        nowValue += 1;
      }),
      now: () => nowValue
    });

    expect(capturedText).toBe("\\alpha");
  });

  it("times out when the clipboard never changes away from the sentinel", async () => {
    let nowValue = 0;
    const capturedText = await waitForClipboardCapture(createPoller(["sentinel", "sentinel"]), {
      sentinel: "sentinel",
      timeoutMs: 1,
      pollIntervalMs: 1,
      sleep: vi.fn(async () => {
        nowValue += 1;
      }),
      now: () => nowValue
    });

    expect(capturedText).toBe("sentinel");
  });

  it("treats empty clipboard snapshots as not captured", async () => {
    let nowValue = 0;
    const capturedText = await waitForClipboardCapture(createPoller(["", ""]), {
      sentinel: "sentinel",
      timeoutMs: 1,
      pollIntervalMs: 1,
      sleep: vi.fn(async () => {
        nowValue += 1;
      }),
      now: () => nowValue
    });

    expect(capturedText).toBe("sentinel");
  });

  it("keeps polling when the clipboard changes to another empty-like value before real text arrives", async () => {
    let nowValue = 0;
    const capturedText = await waitForClipboardCapture(
      createPoller(["sentinel", "", "sentinel", "", "\\gamma"]),
      {
        sentinel: "sentinel",
        timeoutMs: 100,
        pollIntervalMs: 1,
        sleep: vi.fn(async () => {
          nowValue += 1;
        }),
        now: () => nowValue
      }
    );

    expect(capturedText).toBe("\\gamma");
  });

  it("still performs the initial read when timeout is zero", async () => {
    const readClipboardText = vi.fn(async () => "\\delta");
    const capturedText = await waitForClipboardCapture(
      {
        readClipboardText
      },
      {
        sentinel: "sentinel",
        timeoutMs: 0,
        pollIntervalMs: 1,
        now: () => 0
      }
    );

    expect(capturedText).toBe("\\delta");
    expect(readClipboardText).toHaveBeenCalledTimes(1);
  });
});

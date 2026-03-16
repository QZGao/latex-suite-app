import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BridgeClient } from "../bridge-client.js";
import { getHostFixtureLaunchSpec } from "../runtime-paths.js";
import { LineProcess } from "../testing/line-process.js";
import type { GetForegroundWindowResult } from "@latex-suite/contracts";

interface FixtureSnapshot {
  status: string;
  error?: string;
  handle: string;
  text: string;
  enterCount: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function ensureForegroundHost(
  bridge: BridgeClient,
  hwnd: string
): Promise<GetForegroundWindowResult> {
  const restoreResult = await bridge.restoreFocus({ hwnd });
  const foregroundWindow = await bridge.getForegroundWindow();

  if (restoreResult.restored) {
    expect(foregroundWindow?.hwnd.toLowerCase()).toBe(hwnd.toLowerCase());
    return foregroundWindow;
  }

  expect(foregroundWindow?.hwnd.toLowerCase()).toBe(hwnd.toLowerCase());
  return foregroundWindow;
}

describe.sequential("native bridge integration", () => {
  const bridge = new BridgeClient();
  let originalClipboardText = "";

  beforeAll(async () => {
    await bridge.start();
    originalClipboardText = await bridge.readClipboardText();
  });

  afterAll(async () => {
    await bridge.writeClipboardText({ text: originalClipboardText });
    await bridge.dispose();
  });

  it("pings the bridge and round-trips clipboard text", async () => {
    const ping = await bridge.ping();
    expect(ping.bridgeVersion).toBe("0.1.0");

    const foregroundWindow = await bridge.getForegroundWindow();
    expect(foregroundWindow).not.toBeNull();

    await bridge.writeClipboardText({ text: "bridge-roundtrip" });
    await expect(bridge.readClipboardText()).resolves.toBe("bridge-roundtrip");
  });

  it("replaces the current selection inside the host fixture", async () => {
    const fixture = new LineProcess(
      getHostFixtureLaunchSpec([
        "--scenario",
        "selection_replace",
        "--text",
        "alpha beta",
        "--selection-start",
        "6",
        "--selection-length",
        "4",
        "--expect-text",
        "alpha gamma",
        "--timeout-ms",
        "4000",
        "--exit-on-match",
        "--print-ready-json"
      ])
    );

    try {
      const ready = await fixture.nextJsonLine<FixtureSnapshot>();
      expect(ready.status).toBe("ready");

      await ensureForegroundHost(bridge, ready.handle);
      await sleep(150);

      await bridge.writeClipboardText({ text: "gamma" });
      await bridge.sendKeys({
        keys: ["Ctrl+V"],
        settleDelayMs: 100
      });

      const result = await fixture.nextJsonLine<FixtureSnapshot>(10_000);
      expect(result.status).toBe("passed");
      expect(result.text).toBe("alpha gamma");
      await expect(fixture.waitForExit(10_000)).resolves.toBe(0);
    } finally {
      fixture.dispose();
    }
  }, 15_000);

  it("supports adapter-style select-all replace followed by Enter finalization", async () => {
    const fixture = new LineProcess(
      getHostFixtureLaunchSpec([
        "--scenario",
        "auto_selection_replace",
        "--text",
        "x+y",
        "--selection-start",
        "0",
        "--selection-length",
        "3",
        "--expect-text",
        "\\frac{a}{b}",
        "--expect-enter-count",
        "1",
        "--timeout-ms",
        "4000",
        "--exit-on-match",
        "--close-on-enter",
        "--print-ready-json"
      ])
    );

    try {
      const ready = await fixture.nextJsonLine<FixtureSnapshot>();
      expect(ready.status).toBe("ready");

      await ensureForegroundHost(bridge, ready.handle);
      await sleep(150);
      await bridge.writeClipboardText({ text: "__auto-selection-probe__" });

      await bridge.sendKeys({
        keys: ["Ctrl+A", "Ctrl+C"],
        keyDelayMs: 50,
        settleDelayMs: 300
      });
      await expect(bridge.readClipboardText()).resolves.toBe("x+y");

      await bridge.writeClipboardText({ text: "\\frac{a}{b}" });
      await bridge.sendKeys({
        keys: ["Ctrl+V", "Enter"],
        keyDelayMs: 50,
        settleDelayMs: 100
      });

      const result = await fixture.nextJsonLine<FixtureSnapshot>(10_000);
      expect(result.status, result.error ?? JSON.stringify(result)).toBe("passed");
      expect(result.text).toBe("\\frac{a}{b}");
      expect(result.enterCount).toBeGreaterThanOrEqual(1);
      await expect(fixture.waitForExit(10_000)).resolves.toBe(0);
    } finally {
      fixture.dispose();
    }
  }, 15_000);
});

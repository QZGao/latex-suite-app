import { performance } from "node:perf_hooks";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GetForegroundWindowResult } from "@latex-suite/contracts";
import { BridgeClient } from "../bridge-client.js";
import { getHostFixtureLaunchSpec } from "../runtime-paths.js";
import { LineProcess } from "../testing/line-process.js";

interface FixtureSnapshot {
  status: string;
  error?: string;
  handle: string;
  text: string;
  enterCount: number;
}

interface FixtureLaunchOptions {
  scenario: "selection_replace" | "auto_selection_replace";
  text: string;
  selectionStart: number;
  selectionLength: number;
  expectText?: string;
  exitOnMatch?: boolean;
}

interface SelectionReplaceCase {
  label: string;
  initialText: string;
  selectionStart: number;
  selectionLength: number;
  replacementText: string;
  expectedText: string;
}

interface AutoSelectionReplaceCase {
  label: string;
  initialText: string;
  replacementText: string;
  expectedText: string;
  selectionStart?: number;
  selectionLength?: number;
}

function createDurationGuard(label: string, maxMs = 1_000): () => number {
  const startedAt = performance.now();

  return () => {
    const elapsedMs = Math.round(performance.now() - startedAt);
    console.info(`[timing] ${label}: ${elapsedMs} ms`);
    expect(elapsedMs, `${label} took ${elapsedMs} ms.`).toBeLessThanOrEqual(maxMs);
    return elapsedMs;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createFixtureLaunchSpec(options: FixtureLaunchOptions): ReturnType<typeof getHostFixtureLaunchSpec> {
  const args = [
    "--scenario",
    options.scenario,
    "--text",
    options.text,
    "--selection-start",
    String(options.selectionStart),
    "--selection-length",
    String(options.selectionLength),
    "--timeout-ms",
    "4000",
    "--print-ready-json"
  ];

  if (options.expectText !== undefined) {
    args.push("--expect-text", options.expectText);
  }

  if (options.exitOnMatch) {
    args.push("--exit-on-match");
  }

  return getHostFixtureLaunchSpec(args);
}

async function withFixture<T>(
  options: FixtureLaunchOptions,
  run: (fixture: LineProcess, ready: FixtureSnapshot) => Promise<T>
): Promise<T> {
  const fixture = new LineProcess(createFixtureLaunchSpec(options));

  try {
    const ready = await fixture.nextJsonLine<FixtureSnapshot>();
    expect(ready.status).toBe("ready");
    return await run(fixture, ready);
  } finally {
    fixture.dispose();
  }
}

async function sendKeySequence(
  bridge: BridgeClient,
  keys: string[],
  keyDelayMs = 18,
  settleDelayMs = 30
): Promise<void> {
  for (const key of keys) {
    await bridge.sendKeys({
      keys: [key],
      keyDelayMs,
      settleDelayMs
    });
  }
}

async function ensureForegroundHost(
  bridge: BridgeClient,
  hwnd: string
): Promise<GetForegroundWindowResult> {
  const normalizedHwnd = hwnd.toLowerCase();
  let foregroundWindow = await bridge.getForegroundWindow();

  if (foregroundWindow?.hwnd.toLowerCase() === normalizedHwnd) {
    return foregroundWindow;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await bridge.restoreFocus({ hwnd });
    foregroundWindow = await bridge.getForegroundWindow();
    if (foregroundWindow?.hwnd.toLowerCase() === normalizedHwnd) {
      return foregroundWindow;
    }

    await sleep(50);
  }

  expect(foregroundWindow?.hwnd.toLowerCase()).toBe(normalizedHwnd);
  return foregroundWindow;
}

async function runSelectionReplaceCase(
  bridge: BridgeClient,
  options: SelectionReplaceCase
): Promise<void> {
  await withFixture(
    {
      scenario: "selection_replace",
      text: options.initialText,
      selectionStart: options.selectionStart,
      selectionLength: options.selectionLength,
      expectText: options.expectedText,
      exitOnMatch: true
    },
    async (fixture, ready) => {
      await ensureForegroundHost(bridge, ready.handle);
      await sleep(50);
      const assertDuration = createDurationGuard(options.label);

      await bridge.writeClipboardText({ text: options.replacementText });
      await sendKeySequence(bridge, ["Ctrl+V"]);

      const result = await fixture.nextJsonLine<FixtureSnapshot>(10_000);
      expect(result.status).toBe("passed");
      expect(result.text).toBe(options.expectedText);
      assertDuration();
      await expect(fixture.waitForExit(10_000)).resolves.toBe(0);
    }
  );
}

async function runAutoSelectionReplaceCase(
  bridge: BridgeClient,
  options: AutoSelectionReplaceCase
): Promise<void> {
  await withFixture(
    {
      scenario: "auto_selection_replace",
      text: options.initialText,
      selectionStart: options.selectionStart ?? 0,
      selectionLength: options.selectionLength ?? options.initialText.length,
      expectText: options.expectedText,
      exitOnMatch: true
    },
    async (fixture, ready) => {
      await ensureForegroundHost(bridge, ready.handle);
      await sleep(50);
      const assertDuration = createDurationGuard(options.label);

      await bridge.writeClipboardText({ text: "__auto-selection-probe__" });
      await sendKeySequence(bridge, ["Ctrl+A", "Ctrl+C"]);
      await expect(bridge.readClipboardText()).resolves.toBe(options.initialText);

      await bridge.writeClipboardText({ text: options.replacementText });
      await ensureForegroundHost(bridge, ready.handle);
      await sendKeySequence(bridge, ["Ctrl+A", "Ctrl+V"]);

      const result = await fixture.nextJsonLine<FixtureSnapshot>(10_000);
      expect(result.status, result.error ?? JSON.stringify(result)).toBe("passed");
      expect(result.text).toBe(options.expectedText);
      expect(result.enterCount).toBe(0);
      assertDuration();
      await expect(fixture.waitForExit(10_000)).resolves.toBe(0);
    }
  );
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
    await runSelectionReplaceCase(bridge, {
      label: "selection replace bridge round trip",
      initialText: "alpha beta",
      selectionStart: 6,
      selectionLength: 4,
      replacementText: "gamma",
      expectedText: "alpha gamma"
    });
  }, 15_000);

  it("copies the current selection from the host fixture", async () => {
    await withFixture(
      {
        scenario: "selection_replace",
        text: "alpha beta",
        selectionStart: 6,
        selectionLength: 4
      },
      async (_fixture, ready) => {
        await ensureForegroundHost(bridge, ready.handle);
        await sleep(50);
        const assertDuration = createDurationGuard("selection probe bridge round trip");

        await bridge.writeClipboardText({ text: "__selection-probe__" });
        await sendKeySequence(bridge, ["Ctrl+C"]);

        await expect(bridge.readClipboardText()).resolves.toBe("beta");
        assertDuration();
      }
    );
  }, 15_000);

  it("copies only the selected multiline text in selection mode", async () => {
    await withFixture(
      {
        scenario: "selection_replace",
        text: "ax\nby\ncz",
        selectionStart: 3,
        selectionLength: 5
      },
      async (_fixture, ready) => {
        await ensureForegroundHost(bridge, ready.handle);
        await sleep(50);
        const assertDuration = createDurationGuard("selection probe multiline bridge round trip");

        await bridge.writeClipboardText({ text: "__selection-probe__" });
        await sendKeySequence(bridge, ["Ctrl+C"]);

        await expect(bridge.readClipboardText()).resolves.toBe("by\ncz");
        assertDuration();
      }
    );
  }, 15_000);

  it("does not treat an empty selection as captured text", async () => {
    await withFixture(
      {
        scenario: "selection_replace",
        text: "alpha beta",
        selectionStart: 6,
        selectionLength: 0
      },
      async (_fixture, ready) => {
        await ensureForegroundHost(bridge, ready.handle);
        await sleep(50);
        const assertDuration = createDurationGuard("empty selection probe bridge round trip");

        await bridge.writeClipboardText({ text: "__selection-probe__" });
        await sendKeySequence(bridge, ["Ctrl+C"]);

        await expect(bridge.readClipboardText()).resolves.toBe("__selection-probe__");
        assertDuration();
      }
    );
  }, 15_000);

  it("selects all before copy in auto-selection mode even when only part of the host text is selected", async () => {
    await withFixture(
      {
        scenario: "auto_selection_replace",
        text: "left middle right",
        selectionStart: 5,
        selectionLength: 6
      },
      async (_fixture, ready) => {
        await ensureForegroundHost(bridge, ready.handle);
        await sleep(50);
        const assertDuration = createDurationGuard("auto selection capture bridge round trip");

        await bridge.writeClipboardText({ text: "__auto-selection-probe__" });
        await sendKeySequence(bridge, ["Ctrl+A", "Ctrl+C"]);

        await expect(bridge.readClipboardText()).resolves.toBe("left middle right");
        assertDuration();
      }
    );
  }, 15_000);

  it("supports repeated selection replace runs without stale state", async () => {
    const cases: readonly SelectionReplaceCase[] = [
      {
        label: "selection replace repeat run 1",
        initialText: "alpha beta",
        selectionStart: 6,
        selectionLength: 4,
        replacementText: "gamma",
        expectedText: "alpha gamma"
      },
      {
        label: "selection replace repeat run 2",
        initialText: "one two three",
        selectionStart: 4,
        selectionLength: 3,
        replacementText: "TWO",
        expectedText: "one TWO three"
      },
      {
        label: "selection replace repeat run 3",
        initialText: "abc def ghi",
        selectionStart: 8,
        selectionLength: 3,
        replacementText: "XYZ",
        expectedText: "abc def XYZ"
      }
    ];

    for (const testCase of cases) {
      await runSelectionReplaceCase(bridge, testCase);
    }
  }, 30_000);

  it("supports select-all replace without trailing Enter", async () => {
    await runAutoSelectionReplaceCase(bridge, {
      label: "auto selection bridge round trip",
      initialText: "x+y",
      replacementText: "\\frac{a}{b}",
      expectedText: "\\frac{a}{b}"
    });
  }, 15_000);

  it("replaces the full host text in auto-selection mode even when the initial selection is partial", async () => {
    await runAutoSelectionReplaceCase(bridge, {
      label: "auto selection partial host selection bridge round trip",
      initialText: "left middle right",
      replacementText: "\\alpha+\\beta",
      expectedText: "\\alpha+\\beta",
      selectionStart: 5,
      selectionLength: 6
    });
  }, 15_000);

  it("supports repeated auto-selection replace runs without stale state", async () => {
    const cases: readonly AutoSelectionReplaceCase[] = [
      {
        label: "auto selection repeat run 1",
        initialText: "x+y",
        replacementText: "\\frac{a}{b}",
        expectedText: "\\frac{a}{b}"
      },
      {
        label: "auto selection repeat run 2",
        initialText: "a^2+b^2",
        replacementText: "\\sqrt{c}",
        expectedText: "\\sqrt{c}"
      },
      {
        label: "auto selection repeat run 3",
        initialText: "\\int_0^1 x dx",
        replacementText: "\\sum_{i=1}^n i",
        expectedText: "\\sum_{i=1}^n i"
      }
    ];

    for (const testCase of cases) {
      await runAutoSelectionReplaceCase(bridge, testCase);
    }
  }, 30_000);
});

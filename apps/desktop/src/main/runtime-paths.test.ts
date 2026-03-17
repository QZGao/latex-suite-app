import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  getDesktopWinBridgeLaunchSpec,
  getPackagedWinBridgeLaunchSpec
} from "./runtime-paths.js";

const temporaryDirectories: string[] = [];

function createTempResourcesPath(): string {
  const directory = mkdtempSync(join(tmpdir(), "latex-suite-packaging-"));
  temporaryDirectories.push(directory);
  return directory;
}

describe("runtime path resolution", () => {
  afterEach(() => {
    while (temporaryDirectories.length > 0) {
      rmSync(temporaryDirectories.pop()!, {
        recursive: true,
        force: true
      });
    }
  });

  it("resolves the packaged bridge executable from Electron resources", () => {
    const resourcesPath = createTempResourcesPath();
    const bridgeDirectory = join(resourcesPath, "bridge");
    const bridgeExecutablePath = join(bridgeDirectory, "win-bridge.exe");

    mkdirSync(bridgeDirectory, { recursive: true });
    writeFileSync(bridgeExecutablePath, "");

    const launchSpec = getPackagedWinBridgeLaunchSpec(resourcesPath);

    expect(launchSpec.command).toBe(bridgeExecutablePath);
    expect(launchSpec.args).toEqual([]);
    expect(launchSpec.cwd).toBe(bridgeDirectory);
  });

  it("uses the packaged bridge path when the app is packaged", () => {
    const resourcesPath = createTempResourcesPath();
    const bridgeDirectory = join(resourcesPath, "bridge");
    const bridgeExecutablePath = join(bridgeDirectory, "win-bridge.exe");

    mkdirSync(bridgeDirectory, { recursive: true });
    writeFileSync(bridgeExecutablePath, "");

    const launchSpec = getDesktopWinBridgeLaunchSpec({
      isPackaged: true,
      resourcesPath
    });

    expect(launchSpec.command).toBe(bridgeExecutablePath);
    expect(launchSpec.args).toEqual([]);
    expect(launchSpec.cwd).toBe(bridgeDirectory);
  });

  it("throws a clear error when packaged bridge resources are missing", () => {
    const resourcesPath = createTempResourcesPath();

    expect(() => getPackagedWinBridgeLaunchSpec(resourcesPath)).toThrow(
      /Missing packaged bridge executable\. Run the release packaging pipeline first/
    );
  });
});

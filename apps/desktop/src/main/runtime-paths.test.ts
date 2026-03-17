import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  findPortableDesktopExecutableName,
  getDesktopWinBridgeLaunchSpec,
  getDevelopmentDesktopLaunchSpec,
  getPackagedWinBridgeLaunchSpec,
  resolveDevelopmentDesktopExecutablePath
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

  it("resolves the development desktop launch spec through the local Electron shim", () => {
    const executablePath = join(createTempResourcesPath(), "electron.exe");
    writeFileSync(executablePath, "");
    const launchSpec = getDevelopmentDesktopLaunchSpec(["--trace-warnings"], executablePath);

    expect(launchSpec.command).toBe(executablePath);
    expect(launchSpec.args).toEqual([".", "--trace-warnings"]);
    expect(launchSpec.cwd).toMatch(/apps[\\/]+desktop$/i);
  });

  it("resolves the installed Electron executable path from the package location", () => {
    const packageRoot = createTempResourcesPath();
    const executablePath = join(packageRoot, "dist", "electron.exe");

    mkdirSync(dirname(executablePath), { recursive: true });
    writeFileSync(executablePath, "");

    expect(resolveDevelopmentDesktopExecutablePath(packageRoot)).toBe(executablePath);
  });

  it("finds the packaged portable desktop executable by name", () => {
    const artifactsDirectory = createTempResourcesPath();
    writeFileSync(join(artifactsDirectory, "LaTeX Suite Setup 9.9.9.exe"), "");
    writeFileSync(join(artifactsDirectory, "LaTeX Suite 9.9.9.exe"), "");

    expect(findPortableDesktopExecutableName(artifactsDirectory)).toBe(
      "LaTeX Suite 9.9.9.exe"
    );
  });
});

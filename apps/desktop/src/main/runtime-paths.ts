import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export interface LaunchSpec {
  command: string;
  args: string[];
  cwd: string;
}

export interface DesktopRuntimeContext {
  isPackaged: boolean;
  resourcesPath: string;
}

function getRepositoryRoot(): string {
  return resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
}

function assertArtifactExists(path: string, hint: string): string {
  if (!existsSync(path)) {
    throw new Error(`Missing ${hint} at ${path}.`);
  }

  return path;
}

function resolveRepositoryArtifact(relativePath: string, hint: string): string {
  return assertArtifactExists(resolve(getRepositoryRoot(), relativePath), hint);
}

/**
 * Returns the dev/test launch spec for the native bridge sidecar.
 */
export function getWinBridgeLaunchSpec(): LaunchSpec {
  return getDevelopmentWinBridgeLaunchSpec();
}

/**
 * Returns the dev/test launch spec for the native bridge sidecar.
 */
export function getDevelopmentWinBridgeLaunchSpec(): LaunchSpec {
  return {
    command: "dotnet",
    args: [
      resolveRepositoryArtifact(
        "apps/win-bridge/bin/Debug/net9.0-windows/win-bridge.dll",
        "built .NET bridge artifact. Run dotnet build first"
      )
    ],
    cwd: getRepositoryRoot()
  };
}

/**
 * Returns the packaged launch spec for the native bridge sidecar.
 */
export function getPackagedWinBridgeLaunchSpec(resourcesPath: string): LaunchSpec {
  const executablePath = assertArtifactExists(
    resolve(resourcesPath, "bridge", "win-bridge.exe"),
    "packaged bridge executable. Run the release packaging pipeline first"
  );

  return {
    command: executablePath,
    args: [],
    cwd: dirname(executablePath)
  };
}

/**
 * Resolves the correct bridge launch spec for the current desktop runtime.
 */
export function getDesktopWinBridgeLaunchSpec(
  runtimeContext: DesktopRuntimeContext
): LaunchSpec {
  if (runtimeContext.isPackaged) {
    return getPackagedWinBridgeLaunchSpec(runtimeContext.resourcesPath);
  }

  return getDevelopmentWinBridgeLaunchSpec();
}

/**
 * Returns the dev/test launch spec for the CLI-testable host fixture.
 */
export function getHostFixtureLaunchSpec(args: string[] = []): LaunchSpec {
  return {
    command: "dotnet",
    args: [
      resolveRepositoryArtifact(
        "apps/host-fixture/bin/Debug/net9.0-windows/host-fixture.dll",
        "built host fixture artifact. Run dotnet build first"
      ),
      ...args
    ],
    cwd: getRepositoryRoot()
  };
}

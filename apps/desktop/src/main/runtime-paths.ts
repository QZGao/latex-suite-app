import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

export interface LaunchSpec {
  command: string;
  args: string[];
  cwd: string;
}

export interface DesktopRuntimeContext {
  isPackaged: boolean;
  resourcesPath: string;
}

const require = createRequire(import.meta.url);

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

function getDevelopmentDesktopExecutableName(platform: NodeJS.Platform = process.platform): string {
  switch (platform) {
    case "darwin":
      return join("Electron.app", "Contents", "MacOS", "Electron");
    case "win32":
      return "electron.exe";
    default:
      return "electron";
  }
}

function resolveInstalledElectronPackageRoot(): string {
  return dirname(require.resolve("electron/package.json"));
}

export function resolveDevelopmentDesktopExecutablePath(
  packageRoot: string = resolveInstalledElectronPackageRoot()
): string {
  return assertArtifactExists(
    join(packageRoot, "dist", getDevelopmentDesktopExecutableName()),
    "Electron desktop runtime. Run pnpm install first"
  );
}

export function findPortableDesktopExecutableName(
  artifactsDirectory: string
): string | null {
  return (
    readdirSync(artifactsDirectory).find((entry) => {
      return /^LaTeX Suite .*\.exe$/i.test(entry) && !/setup/i.test(entry);
    }) ?? null
  );
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
 * Returns the dev/test launch spec for the Electron desktop shell.
 */
export function getDevelopmentDesktopLaunchSpec(
  args: string[] = [],
  executablePath: string = resolveDevelopmentDesktopExecutablePath()
): LaunchSpec {
  return {
    command: executablePath,
    args: [".", ...args],
    cwd: resolve(getRepositoryRoot(), "apps", "desktop")
  };
}

/**
 * Returns the packaged portable desktop executable.
 */
export function getPackagedDesktopLaunchSpec(args: string[] = []): LaunchSpec {
  const artifactsDirectory = resolveRepositoryArtifact(
    "artifacts/desktop",
    "desktop artifacts directory. Run npm run package:desktop:portable first"
  );
  const portableExecutableName = findPortableDesktopExecutableName(artifactsDirectory);

  if (!portableExecutableName) {
    throw new Error(
      `Missing portable desktop executable in ${artifactsDirectory}. Run npm run package:desktop:portable first.`
    );
  }

  const executablePath = join(artifactsDirectory, portableExecutableName);

  return {
    command: executablePath,
    args,
    cwd: dirname(executablePath)
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

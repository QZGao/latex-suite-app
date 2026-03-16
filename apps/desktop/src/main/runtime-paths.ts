import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export interface LaunchSpec {
  command: string;
  args: string[];
  cwd: string;
}

function getRepositoryRoot(): string {
  return resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
}

function resolveBuiltDllPath(relativePath: string): string {
  const dllPath = resolve(getRepositoryRoot(), relativePath);
  if (!existsSync(dllPath)) {
    throw new Error(`Missing built .NET artifact at ${dllPath}. Run dotnet build first.`);
  }

  return dllPath;
}

/**
 * Returns the dev/test launch spec for the native bridge sidecar.
 */
export function getWinBridgeLaunchSpec(): LaunchSpec {
  return {
    command: "dotnet",
    args: [
      resolveBuiltDllPath("apps/win-bridge/bin/Debug/net9.0-windows/win-bridge.dll")
    ],
    cwd: getRepositoryRoot()
  };
}

/**
 * Returns the dev/test launch spec for the CLI-testable host fixture.
 */
export function getHostFixtureLaunchSpec(args: string[] = []): LaunchSpec {
  return {
    command: "dotnet",
    args: [
      resolveBuiltDllPath("apps/host-fixture/bin/Debug/net9.0-windows/host-fixture.dll"),
      ...args
    ],
    cwd: getRepositoryRoot()
  };
}

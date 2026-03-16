import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import type { LaunchSpec } from "../runtime-paths.js";

/**
 * Small test-only wrapper around a line-oriented child process.
 */
export class LineProcess {
  readonly child: ChildProcessWithoutNullStreams;
  private readonly lines: string[] = [];
  private readonly waiters: Array<(line: string) => void> = [];

  constructor(launchSpec: LaunchSpec) {
    this.child = spawn(launchSpec.command, launchSpec.args, {
      cwd: launchSpec.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    const reader = createInterface({ input: this.child.stdout });
    reader.on("line", (line) => {
      const waiter = this.waiters.shift();
      if (waiter) {
        waiter(line);
        return;
      }

      this.lines.push(line);
    });
  }

  async nextJsonLine<T>(timeoutMs = 5_000): Promise<T> {
    const rawLine = await this.nextLine(timeoutMs);
    return JSON.parse(rawLine) as T;
  }

  async waitForExit(timeoutMs = 5_000): Promise<number> {
    if (this.child.exitCode !== null) {
      return this.child.exitCode;
    }

    return new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for process exit after ${timeoutMs} ms.`));
      }, timeoutMs);

      this.child.once("exit", (code) => {
        clearTimeout(timer);
        resolve(code ?? 0);
      });

      this.child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  dispose(): void {
    this.child.kill();
  }

  private async nextLine(timeoutMs: number): Promise<string> {
    if (this.lines.length > 0) {
      return this.lines.shift() as string;
    }

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for stdout line after ${timeoutMs} ms.`));
      }, timeoutMs);

      this.waiters.push((line) => {
        clearTimeout(timer);
        resolve(line);
      });

      this.child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }
}

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import {
  type BridgeMethod,
  type BridgeResponse,
  type GetForegroundWindowResult,
  type PingResult,
  type RestoreFocusParams,
  type RestoreFocusResult,
  type SendKeysParams,
  type SendKeysResult,
  type WriteClipboardTextParams
} from "@latex-suite/contracts";
import { log, logError } from "./logger.js";
import { getWinBridgeLaunchSpec, type LaunchSpec } from "./runtime-paths.js";

interface PendingRequest<TResult> {
  resolve: (value: TResult) => void;
  reject: (reason: Error) => void;
}

/**
 * Typed JSON-RPC-like client for the native bridge sidecar.
 */
export class BridgeClient {
  private isDisposing = false;
  private readonly launchSpec: LaunchSpec;
  private readonly pendingRequests = new Map<string, PendingRequest<unknown>>();
  private childProcess?: ChildProcessWithoutNullStreams;
  private nextRequestId = 0;

  constructor(launchSpec: LaunchSpec = getWinBridgeLaunchSpec()) {
    this.launchSpec = launchSpec;
  }

  async start(): Promise<void> {
    if (this.childProcess) {
      return;
    }

    const child = spawn(this.launchSpec.command, this.launchSpec.args, {
      cwd: this.launchSpec.cwd,
      stdio: ["pipe", "pipe", "pipe"]
    });
    this.isDisposing = false;

    child.on("exit", (code, signal) => {
      const message = `Bridge exited unexpectedly (code=${code ?? "null"}, signal=${signal ?? "null"}).`;
      this.failPendingRequests(message);
      this.childProcess = undefined;
      if (!this.isDisposing) {
        log("bridge", message);
      }
    });

    child.on("error", (error) => {
      this.failPendingRequests(`Bridge spawn failed: ${error.message}`);
      this.childProcess = undefined;
      logError("bridge", "Bridge process error.", error);
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string | Buffer) => {
      const text = chunk.toString().trim();
      if (text.length > 0) {
        log("bridge", text);
      }
    });

    const lineReader = createInterface({ input: child.stdout });
    lineReader.on("line", (line) => {
      this.handleResponseLine(line);
    });

    this.childProcess = child;
    await this.ping();
  }

  async dispose(): Promise<void> {
    if (!this.childProcess) {
      return;
    }

    const child = this.childProcess;
    this.isDisposing = true;
    this.childProcess = undefined;
    this.failPendingRequests("Bridge client disposed.");
    child.kill();
  }

  async ping(): Promise<PingResult> {
    return this.request("ping", {});
  }

  async getForegroundWindow(): Promise<GetForegroundWindowResult> {
    return this.request("getForegroundWindow", {});
  }

  async restoreFocus(params: RestoreFocusParams): Promise<RestoreFocusResult> {
    return this.request("restoreFocus", params);
  }

  async readClipboardText(): Promise<string> {
    return this.request("readClipboardText", {});
  }

  async writeClipboardText(params: WriteClipboardTextParams): Promise<void> {
    await this.request("writeClipboardText", params);
  }

  async sendKeys(params: SendKeysParams): Promise<SendKeysResult> {
    return this.request("sendKeys", params);
  }

  private async request<TResult>(
    method: BridgeMethod,
    params: Record<string, unknown>
  ): Promise<TResult> {
    await this.start();

    const child = this.childProcess;
    if (!child) {
      throw new Error("Bridge process is not available.");
    }

    const requestId = `req-${++this.nextRequestId}`;
    const payload = JSON.stringify({
      id: requestId,
      method,
      params
    });

    return new Promise<TResult>((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve: resolve as PendingRequest<unknown>["resolve"],
        reject
      });

      child.stdin.write(`${payload}\n`, "utf8", (error) => {
        if (!error) {
          return;
        }

        this.pendingRequests.delete(requestId);
        reject(error);
      });
    });
  }

  private handleResponseLine(line: string): void {
    let response: BridgeResponse<unknown>;

    try {
      response = JSON.parse(line) as BridgeResponse<unknown>;
    } catch (error) {
      logError("bridge", "Failed to parse bridge response.", error);
      return;
    }

    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      return;
    }

    this.pendingRequests.delete(response.id);

    if (!response.ok) {
      pending.reject(new Error(response.error ?? "Unknown bridge error."));
      return;
    }

    pending.resolve(response.result);
  }

  private failPendingRequests(message: string): void {
    for (const [requestId, pending] of this.pendingRequests) {
      pending.reject(new Error(message));
      this.pendingRequests.delete(requestId);
    }
  }
}
